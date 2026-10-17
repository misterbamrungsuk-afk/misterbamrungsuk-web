"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LMap, Marker, Polyline } from "leaflet";
import { kmText } from "@/lib/geo";

// ลูกค้าดูเพื่อนกำลังเดินทางมา (เฉพาะนัดที่จ่ายเงินและเพื่อนรับแล้ว + เพื่อนกด "เริ่มเดินทาง")
// แผนที่: หมุดเพื่อน + หมุดจุดนัด + เส้นประ · ระยะ + เวลาถึงโดยประมาณ + อัปเดตล่าสุด · อัปเดตทุก 20 วิ
type Pt = { lat: number; lng: number };
type R = { state: "waiting" | "moving" | "arrived" | "off"; track: (Pt & { at: string; km: number | null; eta: [number, number] | null; stale: boolean }) | null; dest: Pt | null };
const GOLD = "#e8c472", LN = "rgba(243,234,217,.1)";
const ago = (iso: string) => { const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000); return s < 60 ? "เมื่อสักครู่" : `${Math.round(s / 60)} นาทีที่แล้ว`; };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function LiveTrack({ id, nick, img, startsAt }: { id: string; nick: string; img?: string; startsAt: string }) {
  const [d, setD] = useState<R | null>(null);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const pt = useRef<Marker | null>(null);
  const line = useRef<Polyline | null>(null);
  const fitted = useRef(false);

  useEffect(() => {
    let alive = true;
    const load = () => fetch(`/api/bookings/${id}/track`, { cache: "no-store" }).then((r) => r.json()).then((j) => { if (alive && j?.ok) setD(j); }).catch(() => {});
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 20_000);
    return () => { alive = false; clearInterval(t); };
  }, [id]);

  const tr = d?.track;
  useEffect(() => {
    if (!tr || !el.current) return;
    let off = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (off || !el.current) return;
      if (!map.current) {
        map.current = L.map(el.current, { zoomControl: false, attributionControl: false }).setView([tr.lat, tr.lng], 14);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, className: "tiles-dark" }).addTo(map.current);
        if (d?.dest) L.marker([d.dest.lat, d.dest.lng], { icon: L.divIcon({ className: "hamoo-pin", html: `<div style="width:16px;height:16px;border-radius:50%;background:#c9283d;border:3px solid #f3ead9;box-shadow:0 0 0 4px rgba(201,40,61,.3)"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] }) }).addTo(map.current).bindTooltip("จุดนัด", { permanent: false });
        pt.current = L.marker([tr.lat, tr.lng], { icon: L.divIcon({ className: "hamoo-pin", html: `<div class="pin-wrap"><div class="pin">${img ? `<img src="${esc(img)}" alt="" />` : ""}<span class="pin-badge">🛵</span></div><span class="pin-price">${esc(nick)}</span></div>`, iconSize: [64, 66], iconAnchor: [32, 42] }), zIndexOffset: 1000 }).addTo(map.current);
        if (d?.dest) line.current = L.polyline([[tr.lat, tr.lng], [d.dest.lat, d.dest.lng]], { color: GOLD, weight: 3, opacity: 0.85, dashArray: "2 8", lineCap: "round" }).addTo(map.current);
      } else {
        pt.current?.setLatLng([tr.lat, tr.lng]);
        if (d?.dest) line.current?.setLatLngs([[tr.lat, tr.lng], [d.dest.lat, d.dest.lng]]);
      }
      if (!fitted.current && d?.dest) { map.current.fitBounds([[tr.lat, tr.lng], [d.dest.lat, d.dest.lng]], { padding: [48, 48], maxZoom: 16 }); fitted.current = true; }
    })();
    return () => { off = true; };
  }, [tr?.lat, tr?.lng, tr?.at]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);

  if (!d || d.state === "off") return null;
  const soon = Date.parse(startsAt) - Date.now() < 2 * 3600_000;
  return (
    <section className="rounded-[20px] bg-[#211a18] flex flex-col gap-2.5" style={{ padding: 14, border: `1px solid ${d.state === "moving" ? GOLD : LN}` }} aria-live="polite">
      <b className="text-[15px] font-medium">{d.state === "moving" ? `${nick} กำลังเดินทางมา` : d.state === "arrived" ? `${nick} ถึงจุดนัดแล้ว` : "ตำแหน่งของเพื่อน"}</b>
      {d.state === "waiting" && <p className="m-0 text-[13px] font-light text-[#d9c9b4]">{soon ? `${nick} ยังไม่ได้กดเริ่มเดินทาง · เมื่อเริ่มเดินทาง คุณจะเห็นตำแหน่งและเวลาถึงที่นี่` : "เพื่อนเริ่มแชร์ตำแหน่งได้ก่อนเวลานัด 2 ชม. · คุณจะเห็นตำแหน่งและเวลาถึงที่นี่"}</p>}
      {tr && (
        <>
          <div className="flex items-end justify-between gap-2">
            <span>
              <span className="block text-[22px] font-semibold" style={{ color: GOLD }}>{tr.km == null ? "—" : tr.eta && tr.eta[0] === 0 ? "ใกล้มากแล้ว" : `ถึงใน ${tr.eta?.[0]}–${tr.eta?.[1]} นาที`}</span>
              <span className="text-[12.5px] font-light text-[#d9c9b4]">{tr.km != null ? `ห่างจุดนัด ${kmText(tr.km)} · ` : ""}เวลาประมาณจากระยะทาง ไม่รวมสภาพจราจร</span>
            </span>
            <span className={`text-[11.5px] shrink-0 ${tr.stale ? "text-[#ff8a9a]" : "text-[#b5a596]"}`}>อัปเดต {ago(tr.at)}</span>
          </div>
          <div ref={el} className="relative isolate rounded-2xl overflow-hidden z-0" style={{ height: 220, border: `1px solid ${LN}` }} />
          {tr.stale && <p className="m-0 text-[12px] text-[#ff8a9a]">ตำแหน่งไม่อัปเดตเกิน 10 นาที (สัญญาณหรือเพื่อนปิดหน้าจอ) · ทักแชทถามเพื่อนได้</p>}
          {!d.dest && <p className="m-0 text-[12px] font-light text-[#b5a596]">นัดนี้ไม่ได้ปักหมุดจุดนัด จึงคำนวณเวลาถึงไม่ได้</p>}
        </>
      )}
    </section>
  );
}
