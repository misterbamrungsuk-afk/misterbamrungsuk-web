"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Stars, baht, VerifiedBadge } from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";
import { DEMO_MEMBERS } from "@/lib/demo-data";
import { site } from "@/lib/site";

type Phase = "form" | "matching" | "incoming" | "found";

export default function MatchingPage() {
  const { t, lang } = useI18n();
  const [phase, setPhase] = useState<Phase>("form");
  const [cats, setCats] = useState<string[]>(["thai"]);
  const [hours, setHours] = useState(2);
  const [budget, setBudget] = useState(800);
  const [note, setNote] = useState("");
  // มาจากการ์ดแพ็กเกจหน้าแรก: ?cat=thai&min=90
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const c = sp.get("cat");
    if (c && CATEGORIES.some((x) => x.slug === c)) setCats([c]);
    const m = Number(sp.get("min"));
    if (m) setHours(Math.max(1, Math.round(m / 60)));
  }, []);
  const [countdown, setCountdown] = useState(site.matchAcceptSeconds);
  const [scanningIdx, setScanningIdx] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const candidates = useMemo(
    () => [...DEMO_MEMBERS].sort(() => Math.random() - 0.5).slice(0, 6),
    []
  );
  const matched = candidates[0];

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  function start() {
    setPhase("matching");
    // จำลองบรอดแคสต์: ไล่สแกนผู้ให้บริการใกล้เคียง
    const scan = setInterval(() => setScanningIdx((i) => (i + 1) % candidates.length), 420);
    timers.current.push(
      setTimeout(() => {
        clearInterval(scan);
        setPhase("incoming");
        setCountdown(site.matchAcceptSeconds);
      }, 2600)
    );
  }

  // countdown 15 วินาที — ผู้รับงานต้องกดรับในเวลา (ตัวจริงตรวจฝั่ง server)
  useEffect(() => {
    if (phase !== "incoming") return;
    if (countdown <= 0) { setPhase("matching"); return; }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, countdown]);

  return (
    <>
      <TopBar back="/home" title={`⚡ ${t.quickMatch}`} />

      {phase === "form" && (
        <div className="px-4 py-4 space-y-5 animate-rise">
          <div className="glass rounded-2xl p-4">
            <p className="text-sm text-ink-300">{t.quickMatchDesc}</p>
          </div>
          <section>
            <h2 className="section-title mb-2">{lang === "th" ? "หมวดกิจกรรม" : "Categories"}</h2>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.slice(0, 12).map((c) => (
                <button key={c.slug} onClick={() => setCats((cs) => cs.includes(c.slug) ? cs.filter((x) => x !== c.slug) : [...cs, c.slug])}
                  className={`chip ${cats.includes(c.slug) ? "chip-red" : ""}`}>
                  {c.emoji} {lang === "th" ? c.th : c.en}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h2 className="section-title mb-2">{lang === "th" ? "จำนวนชั่วโมง" : "Hours"}</h2>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 6, 8].map((h) => (
                <button key={h} onClick={() => setHours(h)} className={`chip flex-1 text-center ${hours === h ? "chip-gold" : ""}`}>{h} {t.hoursUnit}</button>
              ))}
            </div>
          </section>
          <section>
            <h2 className="section-title mb-2">{lang === "th" ? `งบประมาณ ~ ${baht(budget)}` : `Budget ~ ${baht(budget)}`}</h2>
            <input type="range" min={200} max={3000} step={100} value={budget} onChange={(e) => setBudget(+e.target.value)} className="w-full accent-[#e5484d]" />
          </section>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="input-dark" placeholder={lang === "th" ? "โน้ตเพิ่มเติม (ไม่บังคับ)…" : "Note (optional)…"} />
          <button onClick={start} disabled={cats.length === 0} className="btn-crimson w-full rounded-xl py-4 font-bold text-base animate-[pulseRed_2.4s_ease-in-out_infinite]">
            ⚡ {t.startMatch}
          </button>
        </div>
      )}

      {phase === "matching" && (
        <div className="px-4 py-10 flex flex-col items-center animate-rise">
          <div className="relative w-44 h-44 grid place-items-center">
            <div className="absolute inset-0 rounded-full border-2 border-crimson-500/30 animate-ping" />
            <div className="absolute inset-4 rounded-full border-2 border-gold-500/30 animate-ping" style={{ animationDelay: "0.4s" }} />
            <div className="absolute inset-8 rounded-full border-2 border-crimson-500/40 animate-ping" style={{ animationDelay: "0.8s" }} />
            <span className="text-5xl">📡</span>
          </div>
          <p className="mt-6 font-semibold text-lg">{t.matching}</p>
          <p className="text-xs text-ink-400 mt-1">{lang === "th" ? "กำลังบรอดแคสต์ไปยังหมอนวดใกล้เคียง…" : "Broadcasting to nearby therapists…"}</p>

          <div className="mt-8 w-full grid gap-2">
            {candidates.slice(0, 4).map((c, i) => (
              <div key={c.id} className={`glass rounded-xl p-3 flex items-center gap-3 transition ${i === scanningIdx ? "border-crimson-500/50" : "opacity-40"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.avatar} alt="" className="w-9 h-9 rounded-full bg-ink-700" />
                <span className="text-sm flex-1">{c.name}</span>
                {i === scanningIdx && <span className="chip chip-red animate-pulse">ping…</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "incoming" && (
        <div className="px-4 py-4 animate-rise">
          <div className="glass rounded-3xl p-6 border-crimson-500/40 text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-crimson-500/20 blur-3xl" />
            <p className="text-xs tracking-widest text-crimson-300 font-bold uppercase">{t.incomingJob}</p>
            <div className="relative w-20 h-20 mx-auto my-4 rounded-full grid place-items-center bg-gradient-to-br from-crimson-600 to-crimson-700 text-3xl font-black shadow-glow-red animate-[pulseRed_1.2s_ease-in-out_infinite]">
              {countdown}
            </div>
            <p className="text-xs text-ink-400">{lang === "th" ? "รับงานภายใน" : "Accept within"} {site.matchAcceptSeconds} {lang === "th" ? "วินาที" : "sec"}</p>

            <div className="mt-5 flex items-center gap-3 text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={matched.avatar} alt="" className="w-14 h-14 rounded-full bg-ink-700" />
              <div className="flex-1">
                <p className="font-bold">{matched.name}</p>
                <p className="text-xs text-ink-400">{matched.age} {t.yearsOld} · 📍 {matched.province}</p>
                <Stars value={4.8} />
              </div>
              {matched.kycVerified && <VerifiedBadge label={t.verified} />}
            </div>

            <div className="mt-4 text-sm text-ink-200 text-left space-y-1">
              <p>⏱️ {hours} {t.hoursUnit} · 💰 ~{baht(budget)}</p>
              {note && <p>📝 {note}</p>}
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setPhase("form")} className="btn-ghost rounded-xl flex-1 py-3 text-sm">{t.dismiss}</button>
              <Link href="/tracking/o1" className="btn-crimson rounded-xl flex-1 py-3 text-sm font-bold grid place-items-center">✓ {t.acceptJob}</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
