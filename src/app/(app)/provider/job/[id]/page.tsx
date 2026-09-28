"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { baht } from "@/components/ui";
import { DEMO_INCOMING } from "@/lib/demo-data";

type Phase = "waiting" | "running" | "done";

// หน้างาน (on-site) — รอลูกค้าสูงสุด 15 นาที → เริ่มงาน → จบงาน → ขอเงินส่วนที่เหลือ
export default function OnSiteJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang } = useI18n();
  const job = DEMO_INCOMING.find((j) => j.id === id) ?? DEMO_INCOMING[0];

  const [phase, setPhase] = useState<Phase>("waiting");
  const [waitSec, setWaitSec] = useState(15 * 60); // รอลูกค้า 15 นาที
  const [runSec, setRunSec] = useState(0);
  const [customerHere, setCustomerHere] = useState(false);

  useEffect(() => {
    if (phase !== "waiting" || customerHere) return;
    if (waitSec <= 0) return; // หมดเวลา — งานถือเป็นยกเลิก ยึดมัดจำตามกติกา
    const tm = setTimeout(() => setWaitSec((s) => s - 1), 1000);
    return () => clearTimeout(tm);
  }, [phase, waitSec, customerHere]);

  useEffect(() => {
    if (phase !== "running") return;
    const iv = setInterval(() => setRunSec((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const earnings = Math.round((job.budget / job.hours) * (runSec / 3600) * 10) / 10;

  return (
    <main className="app-frame safe-bottom pb-8">
      <header className="sticky top-0 z-30 bg-ink-950/90 backdrop-blur-xl border-b border-white/5 px-4 h-14 flex items-center gap-3">
        <Link href="/provider" className="text-ink-200" aria-label="back">‹</Link>
        <h1 className="font-semibold flex-1">🧰 {lang === "th" ? "หน้างาน" : "On-site job"}</h1>
        <span className={`chip ${phase === "running" ? "chip-red animate-pulse" : phase === "done" ? "chip-gold" : ""}`}>
          {phase === "waiting" ? (lang === "th" ? "รอลูกค้า" : "Waiting") : phase === "running" ? (lang === "th" ? "กำลังทำงาน" : "Working") : (lang === "th" ? "จบงาน" : "Done")}
        </span>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* job info */}
        <div className="glass rounded-2xl p-4 animate-rise">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={job.hirer.avatar} alt="" className="w-12 h-12 rounded-full bg-ink-700 object-cover" />
            <div className="flex-1">
              <p className="font-semibold">{job.hirer.name}</p>
              <p className="text-xs text-ink-400">📍 {job.place}</p>
            </div>
            <Link href="/chat/room1" className="btn-ghost rounded-xl px-3 py-2 text-sm">{t.chat}</Link>
          </div>
          <div className="gold-line my-3" />
          <p className="text-sm">{job.title} · {job.hours} {t.hoursUnit} · <span className="text-gold-400 font-bold">{baht(job.budget)}</span></p>
        </div>

        {/* state card */}
        {phase === "waiting" && (
          <div className="glass rounded-2xl p-6 text-center animate-rise border-crimson-500/30">
            <p className="text-xs text-ink-400 uppercase tracking-widest">{lang === "th" ? "รอลูกค้ามาถึง (สูงสุด 15 นาที)" : "Waiting for customer (max 15 min)"}</p>
            <p className={`text-5xl font-black my-4 ${waitSec <= 300 ? "text-crimson-400" : "text-gold-400"}`}>{mmss(waitSec)}</p>
            {waitSec <= 0 ? (
              <div>
                <p className="text-sm text-crimson-300 mb-4">{lang === "th" ? "หมดเวลารอ — ตามกติกา: ยกเลิกงานและรับมัดจำ" : "Timed out — job cancelled, deposit forfeited"}</p>
                <Link href="/provider" className="btn-ghost rounded-xl px-6 py-2.5 text-sm inline-block">{lang === "th" ? "กลับแดชบอร์ด" : "Back"}</Link>
              </div>
            ) : (
              <button onClick={() => { setCustomerHere(true); setPhase("running"); }} className="btn-crimson rounded-xl px-8 py-3 font-bold">
                ✅ {lang === "th" ? "ลูกค้ามาถึงแล้ว — เริ่มงาน" : "Customer arrived — start"}
              </button>
            )}
            <p className="text-[10px] text-ink-500 mt-4">{lang === "th" ? "ลูกค้าสายเกิน 15 นาที ถือว่ายกเลิก มัดจำไม่คืน (ตรวจสอบอัตโนมัติ)" : "15-min no-show = auto cancel, deposit kept"}</p>
          </div>
        )}

        {phase === "running" && (
          <div className="glass rounded-2xl p-6 text-center animate-rise">
            <p className="text-xs text-ink-400 uppercase tracking-widest">{lang === "th" ? "กำลังให้บริการ" : "In progress"}</p>
            <p className="text-5xl font-black text-crimson-400 my-4">{mmss(runSec)}</p>
            <p className="text-sm text-gold-400 font-bold mb-1">{lang === "th" ? "คิดตามจริง ~" : "Earning ~"} {baht(Math.floor(earnings))}</p>
            <p className="text-[10px] text-ink-500 mb-4">{lang === "th" ? "ตำแหน่งของคุณกำลังส่งให้ลูกค้าแบบสด (ติดตาม LIVE)" : "Your location is being shared live"}</p>
            <div className="flex gap-2">
              <Link href="/tracking/o1" className="btn-ghost rounded-xl flex-1 py-3 text-sm">📍 {t.tracking}</Link>
              <button onClick={() => setPhase("done")} className="btn-crimson rounded-xl flex-1 py-3 text-sm font-bold">
                🏁 {lang === "th" ? "จบงาน" : "Finish"}
              </button>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="glass rounded-2xl p-6 text-center animate-rise border-gold-500/40">
            <p className="text-5xl mb-3">🎉</p>
            <p className="font-semibold">{lang === "th" ? "จบงานเรียบร้อย!" : "Job completed!"}</p>
            <p className="text-sm text-ink-300 mt-2">{lang === "th" ? "ส่งงานในระบบกลางเพื่อรับเงิน (หัก GP แล้วโอนเข้าบัญชีคุณ)" : "Deliver via escrow to receive your payout"}</p>
            <div className="flex gap-2 mt-4">
              <Link href="/provider" className="btn-ghost rounded-xl flex-1 py-3 text-sm">{lang === "th" ? "แดชบอร์ด" : "Dashboard"}</Link>
              <Link href="/escrow/e1" className="btn-crimson rounded-xl flex-1 py-3 text-sm font-bold">📦 {lang === "th" ? "ส่งงาน รับเงิน" : "Deliver & get paid"}</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
