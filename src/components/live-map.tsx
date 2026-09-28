"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, CircleMarker, Polyline } from "leaflet";

export default function LiveMap({
  points, myPos, height = 320, followIdx, className = "",
}: {
  points: { lat: number; lng: number }[];
  myPos?: { lat: number; lng: number };
  height?: number;
  followIdx?: number;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const providerMarker = useRef<CircleMarker | null>(null);
  const myMarker = useRef<CircleMarker | null>(null);
  const line = useRef<Polyline | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || map.current) return;

      const center = points[points.length - 1] ?? { lat: 13.7563, lng: 100.5018 };
      map.current = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([center.lat, center.lng], 14);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map.current);

      if (myPos) {
        myMarker.current = L.circleMarker([myPos.lat, myPos.lng], {
          radius: 9, color: "#d4af37", fillColor: "#d4af37", fillOpacity: 0.9, weight: 2,
        }).addTo(map.current).bindPopup("คุณอยู่ที่นี่");
      }
      providerMarker.current = L.circleMarker([center.lat, center.lng], {
        radius: 10, color: "#e5484d", fillColor: "#e5484d", fillOpacity: 0.95, weight: 3,
      }).addTo(map.current).bindPopup("เพื่อนของคุณ");
      line.current = L.polyline(points.map((p) => [p.lat, p.lng] as [number, number]), {
        color: "#e5484d", weight: 3, opacity: 0.7, dashArray: "6 6",
      }).addTo(map.current);
      if (points.length > 1) map.current.fitBounds(line.current.getBounds(), { padding: [30, 30] });
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
