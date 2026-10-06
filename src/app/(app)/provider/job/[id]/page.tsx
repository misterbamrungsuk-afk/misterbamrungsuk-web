"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { baht } from "@/components/ui";
import { DEMO_INCOMING, DEMO_ME } from "@/lib/demo-data";
import { BelongingsChecklist, type BelongingsRecord } from "../../_components/belongings-checklist";
import { UpsellCard } from "../../_components/upsell-card";
import { NoShowEvidence } from "@/components/noshow-evidence";
import { NOSHOW_DECISION_HOURS, PAYOUT_PERCENT } from "@/lib/noshow-rules";

type Phase = "waiting" | "running" | "check" | "done" | "noshow" | "claimed";

// หน้างาน (on-site) — รอลูกค้าสูงสุด 15 นาที → เริ่มงาน → จบงาน → ขอเงินส่วนที่เหลือ
export default function OnSiteJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang } = useI18n();
  const job = DEMO_INCOMING.find((j) => j.id === id) ?? DEMO_INCOMING[0];

  const [phase, setPhase] = useState<Phase>("waiting");
  const [waitSec, setWaitSec] = useState(15 * 60); // รอลูกค้า 15 นาที
  const [runSec, setRunSec] = useState(0);
  const [customerHere, setCustomerHere] = useState(false);
  const [belongings, setBelongings] = useState<BelongingsRecord | null>(null);

  useEffect(() => {
    if (phase !== "waiting" || customerHere) return;
    if (waitSec <= 0) return; // หมดเวลา — ส่งหลักฐาน (GPS + รูป + ประวัติโทร/แชท) ให้แอดมินตรวจ
    const tm = setTimeout(() => setWaitSec((s) => s - 1), 1000);
    return () => clearTimeout(tm);
  }, [phase, waitSec, customerHere]);

  useEffect(() => {
    if (phase !== "running" && phase !== "check") return;
    const iv = setInterval(() => setRunSec((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const earnings = Math.round((job.budget / job.hours) * (runSec / 3600) * 10) / 10;

  return (
    <main className="app-frame safe-bottom pb-8">
      <header className="sticky top-0 z-30 bg-ink-950/90 backdrop-blur-xl border-b border-ink-600 px-4 h-14 flex items-center gap-3">
        <Link href="/provider" className="w-10 h-10 -ml-2 rounded-full border border-ink-600 grid place-items-center text-ink-100 text-xl leading-none" aria-label="back">‹</Link>
        <h1 className="font-semibold flex-1">🧰 {lang === "th" ? "หน้างาน" : "On-site job"}</h1>
        <span className={`chip ${phase === "running" ? "chip-red animate-pulse" : phase === "done" ? "chip-gold" : ""}`}>
          {phase === "waiting" || phase === "noshow" ? (lang === "th" ? "รอลูกค้า" : "Waiting") : phase === "claimed" ? (lang === "th" ? "รอแอดมินตรวจ" : "In review") : phase === "running" ? (lang === "th" ? "กำลังทำงาน" : "Working") : (lang === "th" ? "จบงาน" : "Done")}
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
            <div className="flex flex-col gap-2">
              <button onClick={() => { setCustomerHere(true); setPhase("running"); }} className="btn-crimson rounded-xl px-8 py-3 font-bold">
                ✅ {lang === "th" ? "ลูกค้ามาถึงแล้ว — เริ่มงาน" : "Customer arrived — start"}
              </button>
              <button onClick={() => setPhase("noshow")} disabled={waitSec > 0} className="btn-ghost rounded-xl px-8 py-3 text-sm disabled:opacity-40">
                🚫 {lang === "th" ? "ลูกค้าไม่มา" : "Customer no-show"}{waitSec > 0 && <span className="block text-[10px] text-ink-400">{lang === "th" ? `กดได้เมื่อรอครบ 15 นาที (อีก ${mmss(waitSec)})` : `Available after 15 min (${mmss(waitSec)})`}</span>}
              </button>
            </div>
            <p className="text-[10px] text-ink-500 mt-4">{lang === "th" ? "รอครบ 15 นาที + เช็กอิน GPS + ถ่ายรูปที่จุดนัด แอดมินตรวจหลักฐานทั้งสองฝ่ายก่อนตัดสิน" : "Wait 15 min, GPS check-in and photo at the spot; admin reviews both sides"}</p>
          </div>
        )}

        {phase === "noshow" && (
          <div className="glass rounded-2xl p-5 animate-rise border-crimson-500/30">
            <p className="font-semibold">🚫 {lang === "th" ? "แจ้งลูกค้าไม่มา — หลักฐาน" : "Customer no-show — evidence"}</p>
            <p className="text-xs text-ink-400 mt-1 mb-3">{lang === "th" ? `แอดมินตรวจหลักฐานทั้งสองฝ่ายภายใน ${NOSHOW_DECISION_HOURS} ชม. ถ้าอนุมัติ คุณได้รับ ${PAYOUT_PERCENT}%` : `Admin reviews both sides within ${NOSHOW_DECISION_HOURS}h. If approved you receive ${PAYOUT_PERCENT}%`}</p>
            <NoShowEvidence side="provider" bookingId={job.id} amount={job.budget} customerName={job.hirer.name} providerName={DEMO_ME.name} providerId={DEMO_ME.id}
              roomId="room1" senderId={DEMO_ME.id} th={lang === "th"} onCancel={() => setPhase("waiting")} onDone={() => setPhase("claimed")} />
          </div>
        )}

        {phase === "claimed" && (
          <div className="glass rounded-2xl p-6 text-center animate-rise border-gold-500/40">
            <span className="chip chip-gold">{lang === "th" ? "รอแอดมินตรวจ" : "Awaiting admin review"}</span>
            <p className="font-semibold mt-3">{lang === "th" ? "ส่งหลักฐานแล้ว" : "Evidence sent"}</p>
            <p className="text-sm text-gold-300 mt-1">{lang === "th" ? `ถ้าอนุมัติ คุณได้รับ ${PAYOUT_PERCENT}%` : `If approved you receive ${PAYOUT_PERCENT}%`} ({baht(Math.round(job.budget * PAYOUT_PERCENT / 100))})</p>
            <p className="text-xs text-ink-400 mt-2">{lang === "th" ? `เงินพักไว้กับเราจนแอดมินตัดสิน (ภายใน ${NOSHOW_DECISION_HOURS} ชม.)` : `Money is held until admin decides (within ${NOSHOW_DECISION_HOURS}h)`}</p>
            <Link href="/provider" className="btn-ghost rounded-xl px-6 py-2.5 text-sm inline-block mt-4">{lang === "th" ? "กลับแดชบอร์ด" : "Back"}</Link>
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
              <button onClick={() => setPhase("check")} className="btn-crimson rounded-xl flex-1 py-3 text-sm font-bold">
                🏁 {lang === "th" ? "จบงาน" : "Finish"}
              </button>
            </div>
          </div>
        )}

        {phase === "check" && (
          <BelongingsChecklist jobId={id} th={lang === "th"} onCancel={() => setPhase("running")} onConfirm={(r) => { setBelongings(r); setPhase("done"); }} />
        )}

        {phase === "done" && (
          <div className="glass rounded-2xl p-6 text-center animate-rise border-gold-500/40">
            <p className="text-5xl mb-3">🎉</p>
            <p className="font-semibold">{lang === "th" ? "จบงานเรียบร้อย!" : "Job completed!"}</p>
            {belongings && <p className="text-[11px] text-ink-400 mt-1">🧾 {lang === "th" ? "ยืนยันทรัพย์สินลูกค้าครบ" : "Belongings confirmed"} · {new Date(belongings.confirmedAt).toLocaleTimeString(lang === "th" ? "th-TH" : "en-GB", { hour: "2-digit", minute: "2-digit" })}</p>}
            <p className="text-sm text-ink-300 mt-2">{lang === "th" ? "ส่งงานเพื่อรับเงิน (หักค่าธรรมเนียม 15% แล้วโอนเข้าบัญชีคุณ)" : "Deliver via escrow to receive your payout"}</p>
            <div className="flex gap-2 mt-4">
              <Link href="/provider" className="btn-ghost rounded-xl flex-1 py-3 text-sm">{lang === "th" ? "แดชบอร์ด" : "Dashboard"}</Link>
              <Link href={`/provider/job/${id}/done`} className="btn-crimson rounded-xl flex-1 py-3 text-sm font-bold">📦 {lang === "th" ? "ส่งงาน รับเงิน" : "Deliver & get paid"}</Link>
            </div>
          </div>
        )}

        {(phase === "running" || phase === "done") && <UpsellCard providerId={DEMO_ME.id} th={lang === "th"} />}
      </div>
    </main>
  );
}
