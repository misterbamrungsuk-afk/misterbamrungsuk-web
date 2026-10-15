"use client";
/* eslint-disable @next/next/no-img-element */

// บอร์ด C-Map — แผนที่เต็มจอ · ค้นหาย่าน · กิจกรรม · ชั้นข้อมูล (ทั้งหมด/เพื่อน/พาร์ทเนอร์) · การ์ดเลื่อนด้านล่าง · แผ่นรายละเอียดเมื่อแตะหมุด
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { LayerGroup, Map as LMap } from "leaflet";
import type { Act } from "@/lib/home/people";

export type MapPerson = { id: string; nick: string; age: number; img: string; rating: string; top: boolean; acts: Act[]; area: string; price: number; free: number; lat: number; lng: number; real: boolean };
export type MapVenue = { id: string; name: string; area: string; lat: number; lng: number; sample?: boolean };

const ACTS: [Act, string][] = [["eat", "กิน & เที่ยว"], ["massage", "นวดผ่อนคลาย"], ["cafe", "คาเฟ่"], ["photo", "ถ่ายรูป"], ["movie", "ดูหนัง"], ["gym", "ออกกำลัง"], ["chill", "นั่งชิล"]];
const LABEL = Object.fromEntries(ACTS) as Record<Act, string>;
const baht = (n: number) => "฿" + n.toLocaleString("en-US");
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const SPA = "M12 21c-5 0-8-3-8-7 3 0 6 1 8 4 2-3 5-4 8-4 0 4-3 7-8 7zM12 18c-2-3-2-7 0-11 2 4 2 8 0 11z";
type Sel = { kind: "p"; id: string } | { kind: "v"; id: string } | null;

export function MapView({ people, venues, sample }: { people: MapPerson[]; venues: MapVenue[]; sample: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const [q, setQ] = useState("");
  const [acts, setActs] = useState<Act[]>([]);
  const [show, setShow] = useState<"all" | "p" | "v">("all");
  const [sel, setSel] = useState<Sel>(null);
  const [me, setMe] = useState<[number, number] | null>(null);

  const ps = useMemo(() => show === "v" ? [] : people.filter((p) => acts.every((a) => p.acts.includes(a)) && (!q.trim() || p.area.includes(q.trim()) || p.nick.includes(q.trim()))), [people, acts, q, show]);
  const vs = useMemo(() => show === "p" ? [] : venues.filter((v) => !q.trim() || v.area.includes(q.trim()) || v.name.includes(q.trim())), [venues, q, show]);

  // สร้างแผนที่ครั้งเดียว
  useEffect(() => {
    let off = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (off || !el.current || map.current) return;
      map.current = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([13.7466, 100.5393], 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, className: "tiles-dark", attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map.current);
      layer.current = L.layerGroup().addTo(map.current);
      map.current.on("click", () => setSel(null));
      drawRef.current?.();
    })();
    return () => { off = true; map.current?.remove(); map.current = null; };
  }, []);

  // วาดหมุดใหม่ทุกครั้งที่ตัวกรองเปลี่ยน
  const drawRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    drawRef.current = async () => {
      const L = (await import("leaflet")).default;
      if (!map.current || !layer.current) return;
      layer.current.clearLayers();
      for (const p of ps) {
        const on = sel?.kind === "p" && sel.id === p.id;
        const icon = L.divIcon({ className: "hamoo-pin", iconSize: [58, 70], iconAnchor: [29, 58],
          html: `<div class="mbp${on ? " on" : ""}"><span class="ring"><img src="${esc(p.img)}" alt=""/></span><span class="tag">${esc(p.nick)}</span></div>` });
        L.marker([p.lat, p.lng], { icon, riseOnHover: true, zIndexOffset: on ? 1000 : 0 }).on("click", (e) => { L.DomEvent.stopPropagation(e); setSel({ kind: "p", id: p.id }); }).addTo(layer.current);
      }
      for (const v of vs) {
        const on = sel?.kind === "v" && sel.id === v.id;
        const icon = L.divIcon({ className: "hamoo-pin", iconSize: [40, 40], iconAnchor: [20, 20],
          html: `<div class="mbv${on ? " on" : ""}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${SPA}"/></svg></div>` });
        L.marker([v.lat, v.lng], { icon, zIndexOffset: on ? 1000 : -10 }).on("click", (e) => { L.DomEvent.stopPropagation(e); setSel({ kind: "v", id: v.id }); }).addTo(layer.current);
      }
    };
    drawRef.current();
  }, [ps, vs, sel]);

  // เลือกการ์ด → เลื่อนแผนที่ไปหา
  const focus = (lat: number, lng: number, s: Sel) => { setSel(s); map.current?.flyTo([lat, lng], Math.max(map.current.getZoom(), 14), { duration: 0.6 }); };
  const fitAll = async () => {
    const L = (await import("leaflet")).default;
    const pts = [...ps, ...vs].map((x) => [x.lat, x.lng] as [number, number]);
    if (pts.length && map.current) map.current.fitBounds(L.latLngBounds(pts).pad(0.2), { maxZoom: 14 });
  };
  const locate = () => navigator.geolocation?.getCurrentPosition((pos) => { const m: [number, number] = [pos.coords.latitude, pos.coords.longitude]; setMe(m); map.current?.flyTo(m, 14); }, () => {}, { enableHighAccuracy: true, timeout: 6000 });
  useEffect(() => {
    if (!me || !map.current) return;
    let mk: { remove: () => void } | null = null;
    (async () => { const L = (await import("leaflet")).default; mk = L.marker(me, { icon: L.divIcon({ className: "hamoo-pin", html: '<div class="mbme"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(map.current!); })();
    return () => mk?.remove();
  }, [me]);

  const sp = sel?.kind === "p" ? people.find((p) => p.id === sel.id) : null;
  const sv = sel?.kind === "v" ? venues.find((v) => v.id === sel.id) : null;
  const glass = { background: "rgba(23,18,17,.82)", backdropFilter: "blur(10px)", border: "1px solid rgba(243,234,217,0.1)" };
  const chip = (on: boolean) => ({ ...glass, background: on ? "#e8c472" : glass.background, color: on ? "#1b130b" : "#f3ead9" });

  return (
    <div className="mb-v7 fixed inset-0 overflow-hidden" style={{ background: "#171211", color: "#f3ead9", lineHeight: "normal" }}>
      <style>{`
        .mbp{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;transition:transform .15s}
        .mbp .ring{width:46px;height:46px;border-radius:50%;padding:2px;background:#e8c472;box-shadow:0 6px 16px rgba(0,0,0,.45)}
        .mbp .ring img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;border:2px solid #171211}
        .mbp .tag{font:600 11px/1 'Noto Sans Thai',sans-serif;color:#1b130b;background:#e8c472;border-radius:999px;padding:3px 7px;white-space:nowrap}
        .mbp.on{transform:scale(1.18)} .mbp.on .ring{background:#fff1c9;box-shadow:0 0 0 5px rgba(232,196,114,.35),0 8px 20px rgba(0,0,0,.5)}
        .mbv{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:#241c29;color:#e8c472;border:1.5px solid #e8c472;box-shadow:0 6px 14px rgba(0,0,0,.45);cursor:pointer}
        .mbv.on{background:#e8c472;color:#1b130b}
        .mbme{width:18px;height:18px;border-radius:50%;background:#4ea1ff;border:3px solid #fff;box-shadow:0 0 0 8px rgba(78,161,255,.25)}
        .leaflet-container{background:#171211;font-family:inherit}
      `}</style>
      <div ref={el} className="absolute inset-0" aria-label="แผนที่เพื่อนและสถานที่พาร์ทเนอร์" />

      {/* บน: ย้อนกลับ · ค้นหา · กิจกรรม · ชั้นข้อมูล */}
      <div className="absolute inset-x-0 top-0 z-[500] flex flex-col gap-2 pointer-events-none" style={{ padding: "calc(12px + env(safe-area-inset-top)) 12px 0" }}>
        <div className="flex gap-2 pointer-events-auto max-w-[640px] w-full mx-auto">
          <Link href="/" aria-label="ย้อนกลับ" className="w-11 h-11 shrink-0 rounded-full grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={glass}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
          <label className="flex-1 min-w-0 h-11 rounded-full flex items-center gap-2 px-4" style={glass}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b5a596" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาย่าน เช่น อโศก, ทองหล่อ" aria-label="ค้นหาย่าน" className="flex-1 min-w-0 bg-transparent outline-none text-[14px] text-[#f3ead9] placeholder:text-[#b5a596]" />
          </label>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pointer-events-auto max-w-[640px] w-full mx-auto">
          {ACTS.map(([id, label]) => { const on = acts.includes(id); return <button key={id} type="button" aria-pressed={on} onClick={() => setActs((a) => (on ? a.filter((x) => x !== id) : [...a, id]))} className="shrink-0 h-9 px-3.5 rounded-full text-[13px] font-medium" style={chip(on)}>{label}</button>; })}
        </div>
        <div className="flex justify-between items-center gap-2 pointer-events-auto max-w-[640px] w-full mx-auto">
          <div className="flex rounded-full p-1" style={glass}>
            {([["all", "ทั้งหมด"], ["p", "เพื่อน"], ["v", "พาร์ทเนอร์"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={show === k} onClick={() => setShow(k)} className="h-8 px-3 rounded-full text-[12.5px] font-semibold" style={{ background: show === k ? "#e8c472" : "transparent", color: show === k ? "#1b130b" : "#f3ead9" }}>{l}</button>)}
          </div>
          <span className="rounded-full text-[12px] font-light px-3 py-1.5" style={glass}><b className="text-[#e8c472] font-semibold">{ps.length}</b> เพื่อน · <b className="text-[#e8c472] font-semibold">{vs.length}</b> พาร์ทเนอร์</span>
        </div>
      </div>

      {/* ขวา: ตำแหน่งของฉัน · ดูทั้งหมด */}
      <div className="absolute right-3 z-[500] flex flex-col gap-2" style={{ bottom: sel ? 300 : 190 }}>
        <button type="button" onClick={locate} aria-label="ไปที่ตำแหน่งของฉัน" className="w-11 h-11 rounded-full grid place-items-center text-[#e8c472]" style={glass}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" /></svg></button>
        <button type="button" onClick={fitAll} aria-label="ดูหมุดทั้งหมด" className="w-11 h-11 rounded-full grid place-items-center text-[#e8c472]" style={glass}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg></button>
      </div>

      {/* ล่าง: แผ่นรายละเอียด หรือ การ์ดเลื่อน */}
      <div className="absolute inset-x-0 bottom-0 z-[500]" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
        {sp ? (
          <div className="mx-3 max-w-[560px] md:mx-auto rounded-[22px] p-4 flex flex-col gap-3" style={{ ...glass, background: "rgba(33,26,24,.96)" }}>
            <div className="flex gap-3">
              <img src={sp.img} alt={sp.nick} className="w-[84px] h-[104px] rounded-2xl object-cover shrink-0" />
              <div className="min-w-0 flex-1 flex flex-col gap-1">
                <div className="flex justify-between items-center gap-2"><b className="text-[18px] font-semibold">{sp.nick}{sp.age ? `, ${sp.age}` : ""}</b><span className="text-[13px] text-[#e8c472]">★ {sp.rating}</span></div>
                <div className="text-[12.5px] font-light text-[#d9c9b4]">{sp.area} · {sp.real ? "เปิดให้จองเร็ว ๆ นี้" : sp.free ? `ว่างในอีก ${sp.free} นาที` : "ว่างตอนนี้"}</div>
                <div className="flex flex-wrap gap-1">{sp.acts.slice(0, 3).map((a) => <span key={a} className="text-[11.5px] font-light rounded-full px-2 py-0.5" style={{ border: "1px solid rgba(243,234,217,0.12)" }}>{LABEL[a]}</span>)}</div>
                <div className="font-semibold text-[#e8c472]">{baht(sp.price)} <span className="text-[11px] font-light text-[#b5a596]">/ 3 ชม.</span></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSel(null)} className="h-11 rounded-xl text-[14px] font-semibold" style={{ background: "rgba(243,234,217,0.1)" }}>ปิด</button>
              <Link href={`/p/${sp.id}`} className="h-11 rounded-xl bg-[#e8c472] text-[#1b130b] text-[14px] font-semibold grid place-items-center hover:text-[#1b130b]">ดูโปรไฟล์</Link>
            </div>
          </div>
        ) : sv ? (
          <div className="mx-3 max-w-[560px] md:mx-auto rounded-[22px] p-4 flex flex-col gap-3" style={{ ...glass, background: "rgba(33,26,24,.96)" }}>
            <div><div className="text-[12px] font-light text-[#e8c472]">สถานที่พาร์ทเนอร์ · สปา{sv.sample ? " (ตัวอย่าง)" : ""}</div><b className="text-[18px] font-semibold">{sv.name}</b><div className="text-[12.5px] font-light text-[#d9c9b4]">{sv.area} · นัดเพื่อนมาที่นี่ได้ (เปิดให้จองเร็ว ๆ นี้)</div></div>
            <button type="button" onClick={() => setSel(null)} className="h-11 rounded-xl text-[14px] font-semibold" style={{ background: "rgba(243,234,217,0.1)" }}>ปิด</button>
          </div>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-3 md:justify-center">
            {ps.length === 0 && vs.length === 0 && <div className="mx-auto rounded-2xl px-4 py-3 text-[13px] font-light" style={glass}>ไม่พบในย่านนี้ ลองค้นหาย่านอื่นหรือเอาตัวกรองออก</div>}
            {ps.map((p) => (
              <button key={p.id} type="button" onClick={() => focus(p.lat, p.lng, { kind: "p", id: p.id })} className="shrink-0 w-[220px] rounded-2xl flex gap-2.5 p-2 text-left text-[#f3ead9]" style={{ ...glass, background: "rgba(33,26,24,.94)" }}>
                <img src={p.img} alt="" className="w-[64px] h-[80px] rounded-xl object-cover shrink-0" />
                <span className="min-w-0 flex flex-col gap-0.5"><b className="font-semibold text-[14px] truncate">{p.nick}{p.age ? `, ${p.age}` : ""}</b><span className="text-[11.5px] font-light text-[#d9c9b4] truncate">★ {p.rating} · {p.area}</span><span className="text-[13px] font-semibold text-[#e8c472] mt-auto">{baht(p.price)}<span className="text-[10.5px] font-light text-[#b5a596]"> / 3 ชม.</span></span></span>
              </button>
            ))}
          </div>
        )}
        {sample && !sel && <p className="m-0 mt-2 text-center text-[11px] font-light text-[#b5a596]">ข้อมูลตัวอย่าง · ตำแหน่งบนแผนที่เป็นย่านโดยประมาณ ไม่ใช่ตำแหน่งจริง</p>}
      </div>
    </div>
  );
}
