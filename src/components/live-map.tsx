"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";

export default function LiveMap({
  points, myPos, height = 320, followIdx, className = "", providerAvatar, providerName = "หมอนวดของคุณ",
}: {
  points: { lat: number; lng: number }[];
  myPos?: { lat: number; lng: number };
  height?: number;
  followIdx?: number;
  className?: string;
  providerAvatar?: string;
  providerName?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const providerMarker = useRef<Marker | null>(null);
  const myMarker = useRef<Marker | null>(null);
  const line = useRef<Polyline | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || map.current) return;

      const center = points[points.length - 1] ?? { lat: 13.7563, lng: 100.5018 };
      map.current = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([center.lat, center.lng], 15);
      // OpenStreetMap (ไม่ต้องใช้ key แบบเดียวกับ bazi-sft-dataset) + ฟิลเตอร์ทำโทนมืดใน CSS (.tiles-dark)
      // หมายเหตุ: CARTO basemaps ตอนนี้ขึ้น "API KEY REQUIRED" จึงเลิกใช้
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, className: "tiles-dark",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map.current);

      if (myPos) {
        myMarker.current = L.marker([myPos.lat, myPos.lng], {
          icon: L.divIcon({ className: "hamoo-pin", html: `<div class="pin-wrap"><div class="me-dot"></div></div>`, iconSize: [18, 18], iconAnchor: [9, 9] }),
          zIndexOffset: 1000,
        }).addTo(map.current).bindPopup("📍 คุณอยู่ที่นี่");
      }
      providerMarker.current = L.marker([center.lat, center.lng], {
        icon: L.divIcon({
          className: "hamoo-pin",
          html: `<div class="pin-wrap">
            <div class="pin">${providerAvatar ? `<img src="${providerAvatar}" alt="" />` : ""}<span class="pin-badge">🛵</span></div>
            <span class="pin-price">${providerName}</span>
          </div>`,
          iconSize: [64, 66], iconAnchor: [32, 42], popupAnchor: [0, -44],
        }),
      }).addTo(map.current).bindPopup(`<b>${providerName}</b><br/><span style="font-size:11px;color:#a8a8bd">กำลังเดินทางมาหาคุณ</span>`);

      line.current = L.polyline(points.map((p) => [p.lat, p.lng] as [number, number]), {
        color: "#e5484d", weight: 3.5, opacity: 0.85, dashArray: "1 8", lineCap: "round",
      }).addTo(map.current);
      if (points.length > 1) map.current.fitBounds(line.current.getBounds(), { padding: [40, 40], maxZoom: 16 });
    })();
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
  }, []); // init ครั้งเดียว

  // live update ตำแหน่ง
  useEffect(() => {
    const p = points[points.length - 1];
    if (!p || !map.current || !providerMarker.current || !line.current) return;
    providerMarker.current.setLatLng([p.lat, p.lng]);
    line.current.setLatLngs(points.map((pt) => [pt.lat, pt.lng] as [number, number]));
    if (followIdx !== undefined) map.current.panTo([p.lat, p.lng], { animate: true });
  }, [points, followIdx]);

  return <div ref={el} style={{ height }} className={`rounded-2xl border border-white/10 z-0 ${className}`} />;
}
