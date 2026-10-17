"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Circle, Marker } from "leaflet";

// ข้อความจากผู้ใช้ก่อนใส่ใน HTML ของหมุดแผนที่ (กัน XSS)
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sub: string;
  kind: "friend" | "job";
  avatar?: string;
  price?: string;
  emoji?: string;
  verified?: boolean;
}

export default function NearbyMap({ points, me, height = 400 }: { points: MapPoint[]; me?: { lat: number; lng: number } | null; height?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const meMarker = useRef<Marker | null>(null);
  const radius = useRef<Circle | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || map.current) return;
      const center = me ?? points[0] ?? { lat: 13.7563, lng: 100.5018 };
      map.current = L.map(el.current, { zoomControl: false }).setView([center.lat, center.lng], me ? 13 : 12);
      L.control.zoom({ position: "bottomright" }).addTo(map.current);

      // OpenStreetMap (ไม่ต้องใช้ key แบบเดียวกับ bazi-sft-dataset) + ฟิลเตอร์ทำโทนมืดใน CSS (.tiles-dark)
      // หมายเหตุ: CARTO basemaps ตอนนี้ขึ้น "API KEY REQUIRED" จึงเลิกใช้
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, className: "tiles-dark",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map.current);

      // หมุดหยดน้ำ + รูปโปรไฟล์ + ป้ายราคา
      for (const p of points) {
        const isFriend = p.kind === "friend";
        const icon = L.divIcon({
          className: "hamoo-pin",
          html: `
            <div class="pin-wrap">
              <div class="pin ${isFriend ? "" : "pin-job"}">
                ${p.avatar ? `<img src="${esc(p.avatar)}" alt="" />` : ""}
                <span class="pin-badge">${esc(p.emoji ?? (isFriend ? "👤" : "💼"))}</span>
              </div>
              ${p.price ? `<span class="pin-price">${esc(p.price)}</span>` : ""}
            </div>`,
          iconSize: [64, 66],
          iconAnchor: [32, 42], // ปลายหมุดชี้ตรงพิกัดจริง (หมุดสูง 42px)
          popupAnchor: [0, -44],
        });
        L.marker([p.lat, p.lng], { icon, riseOnHover: true })
          .addTo(map.current)
          .bindPopup(
            `<div style="min-width:150px">
              <b style="font-size:13px">${isFriend ? "👤" : "💼"} ${esc(p.label)}${p.verified ? ' <span style="color:#e0a400">✓</span>' : ""}</b><br/>
              <span style="font-size:11px;color:#a8a8bd">${esc(p.sub)}</span>
            </div>`
          );
      }

      // ตำแหน่งผู้ใช้ + รัศมี
      if (me) {
        radius.current = L.circle([me.lat, me.lng], {
          radius: 1200, color: "#e0a400", weight: 1.5, opacity: 0.5,
          fillColor: "#e0a400", fillOpacity: 0.05, dashArray: "5 7",
        }).addTo(map.current);
        meMarker.current = L.marker([me.lat, me.lng], {
          icon: L.divIcon({ className: "hamoo-pin", html: `<div class="pin-wrap"><div class="me-dot"></div></div>`, iconSize: [18, 18], iconAnchor: [9, 9] }),
          zIndexOffset: 1000,
        }).addTo(map.current).bindPopup("📍 คุณอยู่ที่นี่");
      }

      // ซูมพอดีกลุ่มหมุด
      const all = [...points.map((p) => [p.lat, p.lng] as [number, number]), ...(me ? [[me.lat, me.lng] as [number, number]] : [])];
      if (all.length > 1) map.current.fitBounds(L.latLngBounds(all).pad(0.22), { maxZoom: 14 });
    })();
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!me || !map.current) return;
    map.current.panTo([me.lat, me.lng]);
    meMarker.current?.setLatLng([me.lat, me.lng]);
    radius.current?.setLatLng([me.lat, me.lng]);
  }, [me]);

  return <div ref={el} style={{ height }} className="rounded-2xl border border-ink-600 z-0" />;
}
