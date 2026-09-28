"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, CircleMarker, Circle } from "leaflet";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sub: string;
  kind: "friend" | "job";
  href?: string;
}

export default function NearbyMap({ points, me, height = 360 }: { points: MapPoint[]; me?: { lat: number; lng: number } | null; height?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const meCircle = useRef<Circle | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || map.current) return;
      const center = me ?? points[0] ?? { lat: 13.7563, lng: 100.5018 };
      map.current = L.map(el.current, { zoomControl: false }).setView([center.lat, center.lng], 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map.current);
      L.control.zoom({ position: "bottomright" }).addTo(map.current);

      for (const p of points) {
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: 9,
          color: p.kind === "friend" ? "#e5484d" : "#d4af37",
          fillColor: p.kind === "friend" ? "#e5484d" : "#d4af37",
          fillOpacity: 0.9,
          weight: 3,
        }).addTo(map.current);
        marker.bindPopup(
          `<div style="font-family:sans-serif">
            <b style="color:${p.kind === "friend" ? "#e5484d" : "#b8860b"}">${p.kind === "friend" ? "👤" : "💼"} ${p.label}</b><br/>
            <span style="font-size:11px;color:#666">${p.sub}</span>
          </div>`
        );
      }

      if (me) {
        meCircle.current = L.circle([me.lat, me.lng], {
          radius: 1500, color: "#d4af37", fillColor: "#d4af37", fillOpacity: 0.06, weight: 1.5, dashArray: "4 6",
        }).addTo(map.current);
        L.circleMarker([me.lat, me.lng], { radius: 7, color: "#fff", fillColor: "#7b7b93", fillOpacity: 1, weight: 3 })
          .addTo(map.current).bindPopup("📍 คุณอยู่ที่นี่");
      }
    })();
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!me || !map.current) return;
    map.current.panTo([me.lat, me.lng]);
    meCircle.current?.setLatLng([me.lat, me.lng]);
  }, [me]);

  return <div ref={el} style={{ height }} className="rounded-2xl border border-white/10 z-0" />;
}
