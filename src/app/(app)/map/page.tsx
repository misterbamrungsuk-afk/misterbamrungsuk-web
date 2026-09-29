"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import NearbyMap, { type MapPoint } from "@/components/nearby-map";
import { baht } from "@/components/ui";
import { DEMO_POSTS, DEMO_JOBS } from "@/lib/demo-data";

export default function NearbyMapPage() {
  const { t, lang } = useI18n();
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [show, setShow] = useState<"all" | "friend" | "job">("all");

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => {
        setMe({ lat: 13.7563, lng: 100.5018 }); // fallback กลางกรุงเทพ
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }

  const points = useMemo<MapPoint[]>(() => {
    const friends: MapPoint[] = DEMO_POSTS
      .filter((p) => p.lat && p.lng)
      .map((p) => ({
        id: p.id, lat: p.lat!, lng: p.lng!, kind: "friend" as const,
        label: p.member.name, sub: `⭐ ${p.rating ?? "-"} · 📍 ${p.province}`,
        avatar: p.member.avatar, verified: p.member.kycVerified,
        price: `${baht(p.pricePerHour)}${t.perHour}`,
        href: `/post/${p.id}`,
      }));
    const jobs: MapPoint[] = DEMO_JOBS
      .filter((j) => j.lat && j.lng)
      .map((j) => ({
        id: j.id, lat: j.lat, lng: j.lng, kind: "job" as const,
        label: j.title.slice(0, 22), sub: `${baht(j.budget)} · 🕒 ${j.startTime}`,
        avatar: j.owner.avatar, emoji: "💼",
        href: "/jobs",
      }));
    return show === "friend" ? friends : show === "job" ? jobs : [...friends, ...jobs];
  }, [show, t.perHour]);

  return (
    <>
      <TopBar back="/home" title={`🗺️ ${lang === "th" ? "แผนที่ใกล้ฉัน" : "Nearby map"}`} />

      <div className="px-4 pt-4 space-y-3">
        <div className="flex gap-2">
          <button onClick={locate} disabled={locating} className="btn-crimson rounded-xl px-4 py-2.5 text-sm font-semibold flex-1">
            {locating ? "…" : `🧭 ${t.useMyLocation}`}
          </button>
          {([["all", t.all], ["friend", lang === "th" ? "หมอนวด" : "Therapists"], ["job", lang === "th" ? "งาน" : "Jobs"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setShow(v)} className={`chip ${show === v ? "chip-red" : ""}`}>{l}</button>
          ))}
        </div>

        <div className="animate-rise"><NearbyMap points={points} me={me} height={380} /></div>

        <p className="text-[11px] text-ink-500 text-center">
          🔴 {lang === "th" ? "หมอนวด" : "Therapists"} · 🟡 {lang === "th" ? "ประกาศงาน" : "Jobs"} {me ? `· ⭕ ${lang === "th" ? "รัศมี 1.5 กม. รอบคุณ" : "1.5km around you"}` : ""}
        </p>

        {/* list รอบตัว */}
        <div className="grid gap-2 pb-4">
          {DEMO_POSTS.filter((p) => p.lat).slice(0, 4).map((p) => (
            <Link key={p.id} href={`/post/${p.id}`} className="glass glass-hover rounded-2xl p-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.images[0]} alt="" className="w-14 h-14 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.member.name}</p>
                <p className="text-xs text-ink-400 truncate">{p.serviceArea}</p>
              </div>
              <span className="text-gold-400 font-bold text-sm">{baht(p.pricePerHour)}<span className="text-ink-400 text-[10px]">{t.perHour}</span></span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
