"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LMap } from "leaflet";
import type { LatLng } from "@/lib/geo";

// ปักหมุดบนแผนที่: เลื่อนแผนที่ให้หมุดกลางจออยู่ตรงจุดที่ต้องการ (ใช้นิ้วเดียวบนมือถือได้) · ปุ่ม "ใช้ตำแหน่งฉัน"
const BKK: LatLng = { lat: 13.7466, lng: 100.5393 };

export function PinPicker({ value, onChange, height = 220, zoom = 15, hint = "เลื่อนแผนที่ให้หมุดอยู่ตรงจุดนัด" }: { value: LatLng | null; onChange: (p: LatLng, accuracy?: number) => void; height?: number; zoom?: number; hint?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;
  const [gpsMsg, setGpsMsg] = useState("");

  useEffect(() => {
    let off = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (off || !el.current || map.current) return;
      const c = value ?? BKK;
      map.current = L.map(el.current, { zoomControl: false, attributionControl: false }).setView([c.lat, c.lng], value ? zoom : 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, className: "tiles-dark" }).addTo(map.current);
      map.current.on("moveend", () => { const m = map.current!.getCenter(); cb.current({ lat: Math.round(m.lat * 1e5) / 1e5, lng: Math.round(m.lng * 1e5) / 1e5 }); });
    })();
    return () => { off = true; map.current?.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const gps = () => {
    if (!navigator.geolocation) { setGpsMsg("เครื่องนี้ไม่รองรับ GPS · เลื่อนแผนที่เอง"); return; }
    setGpsMsg("กำลังหาตำแหน่ง…");
    navigator.geolocation.getCurrentPosition(
      (p) => { setGpsMsg(""); const v = { lat: p.coords.latitude, lng: p.coords.longitude }; map.current?.setView([v.lat, v.lng], 16); cb.current(v, p.coords.accuracy); },
      () => setGpsMsg("เปิดตำแหน่ง (Location) ไม่ได้ · อนุญาตในตั้งค่าเบราว์เซอร์ หรือเลื่อนแผนที่เอง"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative rounded-2xl overflow-hidden" style={{ height, border: "1px solid rgba(243,234,217,.12)" }}>
        <div ref={el} className="absolute inset-0 z-0" />
        {/* หมุดกลางจอ */}
        <svg className="absolute left-1/2 top-1/2 z-[400] pointer-events-none" style={{ transform: "translate(-50%, -100%)" }} width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">
          <path d="M17 43C17 43 32 27 32 16A15 15 0 0 0 2 16C2 27 17 43 17 43Z" fill="#c9283d" stroke="#f3ead9" strokeWidth="2" /><circle cx="17" cy="16" r="5.5" fill="#f3ead9" />
        </svg>
        <button type="button" onClick={gps} className="absolute right-2 bottom-2 z-[400] h-9 px-3 rounded-full text-[12.5px] font-semibold text-[#1b130b] bg-[#e8c472]" style={{ boxShadow: "0 2px 8px rgba(0,0,0,.4)" }}>◎ ใช้ตำแหน่งฉัน</button>
      </div>
      <span className="text-[12px] font-light text-[#b5a596]">{gpsMsg || hint}</span>
    </div>
  );
}
