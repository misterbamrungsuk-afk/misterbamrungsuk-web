"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { baht } from "@/components/ui";
import LiveMap from "@/components/live-map";
import { DEMO_MEMBERS } from "@/lib/demo-data";
import { DEMO_ORDER } from "@/lib/demo-data";

// เส้นทางจำลอง: จากสยาม → ทองหล่อ (โหมดจริง: TrackingPoint จาก GPS ผู้ให้บริการ ผ่าน Supabase Realtime)
const ROUTE = [
  { lat: 13.7465, lng: 100.5349 },
  { lat: 13.7400, lng: 100.5390 },
  { lat: 13.7350, lng: 100.5460 },
  { lat: 13.7310, lng: 100.5520 },
  { lat: 13.7279, lng: 100.5600 },
  { lat: 13.7279, lng: 100.5685 },
];

export default function TrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang } = useI18n();
  const provider = DEMO_MEMBERS[0];
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(true);
  const [eta, setEta] = useState(9);

  const points = useMemo(() => ROUTE.slice(0, idx + 1), [idx]);
  const myPos = ROUTE[ROUTE.length - 1];

  useEffect(() => {
    if (!running || idx >= ROUTE.length - 1) return;
    const id2 = setTimeout(() => { setIdx((i) => Math.min(i + 1, ROUTE.length - 1)); setEta((e) => Math.max(1, e - 1.5)); }, 1600);
    return () => clearTimeout(id2);
  }, [running, idx]);

  const arrived = idx >= ROUTE.length - 1;

  return (
    <main className="app-frame safe-bottom pb-8">
      <header className="sticky top-0 z-30 bg-ink-950/90 backdrop-blur-xl border-b border-white/5 px-4 h-14 flex items-center gap-3">
        <Link href="/home" className="text-ink-200" aria-label="back">‹</Link>
        <h1 className="font-semibold flex-1">📍 {t.tracking}</h1>
        <span className={`chip ${arrived ? "chip-gold" : "chip-red animate-pulse"}`}>● LIVE</span>
      </header>

      <div className="px-4 py-4 space-y-4">
        <div className="glass rounded-2xl p-4 flex items-center gap-3 animate-rise">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={provider.avatar} alt="" className="w-12 h-12 rounded-full bg-ink-700" />
          <div className="flex-1">
            <p className="font-semibold">{provider.name}</p>
            <p className="text-xs text-ink-400">{t.providerHeading}</p>
          </div>
          <Link href="/chat/room1" className="btn-crimson rounded-xl px-4 py-2 text-sm font-semibold">{t.chat}</Link>
        </div>

        <div className="animate-rise">
          <LiveMap points={points} myPos={myPos} height={340} followIdx={idx} providerAvatar={provider.avatar} providerName={provider.name} />
        </div>

        <div className="grid grid-cols-3 gap-3 animate-rise">
          <div className="glass rounded-xl p-3 text-center">
            <p className="text-[10px] text-ink-400 uppercase">ETA</p>
            <p className="text-xl font-bold text-gold-400">{arrived ? "0" : Math.ceil(eta)}<span className="text-xs text-ink-400"> {lang === "th" ? "นาที" : "min"}</span></p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <p className="text-[10px] text-ink-400 uppercase">{t.orderTimeline}</p>
            <p className="text-sm font-bold mt-1 text-crimson-300">{t.stInProgress}</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <p className="text-[10px] text-ink-400 uppercase">{lang === "th" ? "ยอดรวม" : "Total"}</p>
            <p className="text-xl font-bold text-gold-400">{baht(DEMO_ORDER.totalAmount)}</p>
          </div>
        </div>

        <p className="text-[11px] text-ink-500 text-center">
          {running && !arrived ? `🛰️ ${t.liveLocation}` : arrived ? (lang === "th" ? "🎉 เพื่อนของคุณมาถึงแล้ว!" : "🎉 Your friend has arrived!") : ""}
        </p>

        {!running && !arrived && (
          <button onClick={() => setRunning(true)} className="btn-ghost rounded-xl w-full py-2.5 text-sm">
            ▶ {lang === "th" ? "เล่นต่อ" : "Resume"}
          </button>
        )}
      </div>
    </main>
  );
}
