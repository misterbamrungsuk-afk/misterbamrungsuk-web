"use client";

import { useEffect, useRef, useState } from "react";

// ปุ่ม "เริ่มเดินทาง" ของ Part-Time — ส่งตำแหน่งให้ลูกค้าที่จ่ายเงินแล้วเห็นระหว่างเดินทาง (ทุก ~20 วิ ขณะเปิดหน้านี้ค้างไว้)
// หยุดเองเมื่อกด "ถึงจุดนัด" (สถานะเปลี่ยน) · กันจอดับระหว่างแชร์ · Part-Time ไม่เห็นตำแหน่งลูกค้า เห็นแค่จุดนัด (ไว้นำทาง)
type T = { km: number | null; eta: [number, number] | null; at: string };
const GOLD = "#e8c472";
const KEY = (id: string) => `mb_trk_${id}`;

export function TravelShare({ mb, t, id, startsAt, dest }: { mb: string; t: string | null; id: string; startsAt: string; dest: { lat?: number; lng?: number } }) {
  const [on, setOn] = useState(false);
  const [info, setInfo] = useState<T | null>(null);
  const [err, setErr] = useState("");
  const watch = useRef<number | null>(null);
  const last = useRef(0);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);
  const can = Date.parse(startsAt) - Date.now() < 2 * 3600_000;

  const stop = () => {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null; setOn(false); wake.current?.release().catch(() => {}); wake.current = null;
    try { sessionStorage.removeItem(KEY(id)); } catch {}
  };
  const send = async (p: GeolocationPosition) => {
    if (Date.now() - last.current < 20_000) return;
    last.current = Date.now();
    const r = await fetch(`/api/pt/bookings/${id}/track`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t, lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (d?.ok) { setInfo(d.track); setErr(""); } else if (r?.status === 409) { setErr(d?.error || "หยุดแชร์ตำแหน่งแล้ว"); stop(); }
  };
  const start = () => {
    if (!navigator.geolocation) return setErr("เครื่องนี้ไม่รองรับ GPS");
    setErr(""); setOn(true); last.current = 0;
    try { sessionStorage.setItem(KEY(id), "1"); } catch {}
    watch.current = navigator.geolocation.watchPosition(send, () => setErr("เปิดตำแหน่ง (Location) ไม่ได้ · อนุญาตในตั้งค่าเบราว์เซอร์แล้วกดใหม่"), { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 });
    (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen").then((w) => { wake.current = w; }).catch(() => {});
  };
  useEffect(() => { try { if (sessionStorage.getItem(KEY(id)) && can) start(); } catch {} return () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); wake.current?.release().catch(() => {}); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nav = dest.lat != null && dest.lng != null ? `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}` : null;
  const near = info?.km != null && info.km < 0.15;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        {on
          ? <button type="button" onClick={stop} className="flex-1 h-11 rounded-xl text-[13px] font-semibold" style={{ border: "1px solid #7fd6a3", color: "#7fd6a3" }}>● กำลังแชร์ตำแหน่ง · แตะเพื่อหยุด</button>
          : <button type="button" disabled={!can} onClick={start} title={can ? "" : "เริ่มเดินทางได้ก่อนเวลานัด 2 ชม."} className="flex-1 h-11 rounded-xl text-[13px] font-semibold disabled:opacity-40" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>เริ่มเดินทาง (แชร์ตำแหน่งให้ลูกค้า)</button>}
        {nav && <a href={nav} target="_blank" rel="noreferrer" className="h-11 px-3 rounded-xl text-[13px] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: "1px solid rgba(243,234,217,.12)" }}>นำทาง ↗</a>}
      </div>
      {on && <span className="text-[12px] font-light text-[#d9c9b4]">{info?.km != null ? `ห่างจุดนัด ${info.km < 1 ? `${Math.round(info.km * 1000)} ม.` : `${info.km.toFixed(1)} กม.`}${info.eta && info.eta[0] > 0 ? ` · ถึงประมาณ ${info.eta[0]}–${info.eta[1]} นาที` : ""}` : "กำลังส่งตำแหน่ง…"} · เปิดหน้านี้ค้างไว้ระหว่างเดินทาง</span>}
      {near && <span className="text-[13px] font-semibold" style={{ color: "#7fd6a3" }}>ใกล้จุดนัดแล้ว · กด &quot;ถึงจุดนัด&quot; เมื่อพบลูกค้า</span>}
      {err && <span className="text-[12px] text-[#ff8a9a]">{err}</span>}
    </div>
  );
}
