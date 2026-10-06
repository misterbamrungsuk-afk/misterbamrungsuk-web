"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { EmptyState, baht } from "@/components/ui";
import { DEMO_INCOMING } from "@/lib/demo-data";

/** หักค่าแพลตฟอร์ม 15% */
const FEE = 0.15;
const DECLINE_REASONS = ["ติดงานอื่นในช่วงเวลานี้", "ระยะทางไกลเกินไป", "ไม่สะดวกเวลานี้", "ไม่ถนัดบริการนี้", "อื่นๆ"] as const;

type Status = "pending" | "accepted" | "declined";
interface Job {
  id: string;
  day: number; // วันที่ของเดือนนี้
  start: string;
  end: string;
  service: string;
  customer: string;
  avatar: string;
  language: string;
  place: string;
  distanceKm: number;
  travelMin: number;
  note: string;
  budget: number;
  status: Status;
}

// เดโม: ต่อยอดจาก DEMO_INCOMING + เพิ่มเวลา ภาษา โน้ตลูกค้า
const today = new Date();
const D = today.getDate();
const SEED: Job[] = [
  { ...pick(0), day: D, start: "17:00", end: "21:00", service: "กินข้าว + ดูหนัง", language: "ไทย", travelMin: 15, note: "ชอบอาหารญี่ปุ่น อยากได้คนคุยเก่งค่ะ", status: "pending" },
  { ...pick(1), day: D, start: "13:00", end: "16:00", service: "คาเฟ่ + ถ่ายรูป", language: "English", travelMin: 25, note: "First time in Bangkok, would love a local cafe tour.", status: "pending" },
  { ...pick(0), id: "acc1", day: D, start: "10:00", end: "13:00", service: "ออกกำลัง + บรันช์", language: "ไทย", travelMin: 10, note: "", status: "accepted" },
  { ...pick(1), id: "acc2", day: Math.min(D + 2, 28), start: "18:00", end: "23:00", service: "กิน & เที่ยว", language: "中文", travelMin: 30, note: "เดินเยาวราช", status: "accepted" },
];
function pick(i: number) {
  const j = DEMO_INCOMING[i % DEMO_INCOMING.length];
  return { id: j.id, customer: j.hirer.name, avatar: j.hirer.avatar, place: j.place, distanceKm: j.distanceKm, budget: j.budget };
}

export default function IncomingJobsPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const [jobs, setJobs] = useState<Job[]>(SEED);
  const [selDay, setSelDay] = useState<number>(D);
  const [declining, setDeclining] = useState<Job | null>(null);
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  const accept = (j: Job) => { setJobs((js) => js.map((x) => (x.id === j.id ? { ...x, status: "accepted" } : x))); flash(th ? "รับงานแล้ว" : "Job accepted"); };
  const confirmDecline = () => {
    if (!declining || !reason) return;
    setJobs((js) => js.map((x) => (x.id === declining.id ? { ...x, status: "declined" } : x)));
    setDeclining(null); setReason(""); setNote("");
    flash(th ? "ปฏิเสธงานแล้ว · ระบบส่งต่อให้ผู้ให้บริการท่านอื่น" : "Declined");
  };

  const pending = jobs.filter((j) => j.status === "pending");
  const acceptedToday = jobs.filter((j) => j.status === "accepted" && j.day === D).length;
  const monthCount = jobs.filter((j) => j.status === "accepted").length + 12; // + งานก่อนหน้าในเดือน (เดโม)
  const dayJobs = jobs.filter((j) => j.day === selDay && j.status !== "declined").sort((a, b) => a.start.localeCompare(b.start));

  // ปฏิทินเดือนนี้
  const cal = useMemo(() => {
    const first = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
    const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)] as (number | null)[];
  }, []);
  const monthName = today.toLocaleDateString(th ? "th-TH" : "en-US", { month: "long", year: "numeric" });

  return (
    <>
      <TopBar back="/provider" title={th ? "ตารางงานของฉัน" : "My schedule"} />
      <div className="px-4 py-4 space-y-4">
        {/* KPI */}
        <div className="grid grid-cols-3 gap-2">
          {[
            [String(pending.length), th ? "รอตอบรับ" : "Pending", "text-crimson-300"],
            [String(acceptedToday), th ? "รับแล้ววันนี้" : "Accepted today", "text-emerald-300"],
            [String(monthCount), th ? "งานเดือนนี้" : "This month", "text-gold-300"],
          ].map(([v, k, c]) => (
            <div key={k} className="rounded-2xl border border-ink-600 bg-ink-800 p-3 text-center">
              <p className={`font-display text-2xl font-bold ${c}`}>{v}</p>
              <p className="text-[11px] text-ink-300 mt-0.5">{k}</p>
            </div>
          ))}
        </div>

        {/* ปฏิทิน */}
        <div className="rounded-2xl border border-ink-600 bg-ink-800 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{monthName}</p>
            <div className="flex gap-3 text-[11px] text-ink-300">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gold-500" />{th ? "ตารางนัด" : "Request"}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />{th ? "รับแล้ว" : "Accepted"}</span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mt-3 text-center text-[11px] text-ink-400">
            {(th ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] : ["S", "M", "T", "W", "T", "F", "S"]).map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1 mt-1">
            {cal.map((d, i) => {
              if (!d) return <span key={i} />;
              const js = jobs.filter((j) => j.day === d && j.status !== "declined");
              const on = d === selDay;
              return (
                <button key={i} onClick={() => setSelDay(d)} aria-pressed={on}
                  className={`h-10 rounded-xl text-sm flex flex-col items-center justify-center gap-0.5 transition ${on ? "bg-crimson-500 text-white" : d === D ? "border border-gold-500/60 text-gold-300" : "hover:bg-ink-700"}`}>
                  {d}
                  <span className="flex gap-0.5 h-1.5">
                    {js.some((j) => j.status === "pending") && <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />}
                    {js.some((j) => j.status === "accepted") && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* รายการงาน */}
        {dayJobs.length === 0 && <EmptyState icon="📅" title={th ? "ไม่มีงานในวันนี้" : "No jobs this day"} sub={th ? "เปิดสถานะออนไลน์ไว้ ระบบจะส่งงานในพื้นที่มาให้" : "Stay online to receive jobs"} />}
        {dayJobs.map((j) => {
          const net = Math.round(j.budget * (1 - FEE));
          const accepted = j.status === "accepted";
          return (
            <article key={j.id} className={`rounded-2xl border bg-ink-800 p-4 ${accepted ? "border-emerald-500/40" : "border-gold-500/40"}`}>
              <div className="flex items-center justify-between">
                <span className="font-display text-lg text-gold-300">{j.start} – {j.end}</span>
                <span className={`chip ${accepted ? "" : "chip-gold"}`}>{accepted ? (th ? "✓ รับแล้ว" : "Accepted") : (th ? "รอตอบรับ" : "Pending")}</span>
              </div>
              <p className="font-semibold mt-1">{j.service}</p>
              <div className="flex items-center gap-3 mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={j.avatar} alt="" className="w-11 h-11 rounded-full object-cover bg-ink-700" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{j.customer}</p>
                  <p className="text-xs text-ink-300">{th ? "ภาษา" : "Language"}: {j.language}</p>
                </div>
              </div>
              <p className="text-xs text-ink-300 mt-3">📍 {j.place} · {j.distanceKm} {th ? "กม." : "km"} · ~{j.travelMin} {th ? "นาที" : "min"}</p>
              {j.note && <p className="mt-2 rounded-xl bg-ink-900/60 border border-ink-600 px-3 py-2 text-[13px] text-ink-200">💬 {j.note}</p>}
              <div className="flex items-baseline justify-between mt-3">
                <span className="text-xs text-ink-300">{th ? "รายได้ของคุณ (หัก 15%)" : "Your earnings (−15%)"}</span>
                <span className="font-display text-xl font-bold text-gold-300">{baht(net)}</span>
              </div>
              {accepted ? (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <a href="/chat" className="btn-ghost h-11 rounded-xl text-sm grid place-items-center">💬 {th ? "แชท" : "Chat"}</a>
                  <a href="tel:" className="btn-ghost h-11 rounded-xl text-sm grid place-items-center">📞 {th ? "โทร" : "Call"}</a>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(j.place)}`} target="_blank" rel="noopener noreferrer" className="btn-ghost h-11 rounded-xl text-sm grid place-items-center">🧭 {th ? "นำทาง" : "Navigate"}</a>
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setDeclining(j)} className="btn-ghost rounded-xl flex-1 h-11 text-sm">{th ? "ปฏิเสธงาน" : "Decline"}</button>
                  <button onClick={() => accept(j)} className="btn-crimson rounded-xl flex-1 h-11 text-sm font-bold">✓ {th ? "รับงาน" : "Accept"}</button>
                </div>
              )}
            </article>
          );
        })}
        <p className="text-[11px] text-ink-500 text-center">{th ? "งานถูกส่งตรงถึงคุณตามบริการ พื้นที่ และเวลาที่สะดวก" : "Jobs are matched to your services, area and availability"}</p>
      </div>

      {/* modal เหตุผลการปฏิเสธ */}
      {declining && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setDeclining(null)}>
          <div className="w-full max-w-[440px] rounded-3xl border border-ink-600 bg-ink-800 p-5" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-lg font-semibold">{th ? "เหตุผลที่ปฏิเสธงาน" : "Reason for declining"}</p>
            <p className="text-xs text-ink-300 mt-1">{declining.service} · {declining.start}–{declining.end}</p>
            <div className="mt-4 space-y-2">
              {DECLINE_REASONS.map((r) => (
                <label key={r} className={`flex items-center gap-3 rounded-xl border px-3 py-3 cursor-pointer ${reason === r ? "border-gold-500 bg-gold-500/10" : "border-ink-600"}`}>
                  <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-[#d4af37]" />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
            </div>
            <textarea className="input-dark w-full min-h-20 py-3 mt-3" placeholder={th ? "หมายเหตุเพิ่มเติม (ไม่บังคับ)" : "Note (optional)"} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            <p className="text-[11px] text-ink-400 mt-2">{th ? "การปฏิเสธบ่อยมีผลต่อเงื่อนไขการคืนค่าการันตี" : "Frequent declines affect your guarantee refund"}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setDeclining(null)} className="btn-ghost flex-1 h-11 rounded-xl text-sm">{th ? "ยกเลิก" : "Cancel"}</button>
              <button onClick={confirmDecline} disabled={!reason} className="btn-crimson flex-1 h-11 rounded-xl text-sm font-bold">{th ? "ยืนยันปฏิเสธ" : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div role="status" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-full bg-ink-800 border border-gold-500/40 px-4 py-2 text-sm text-gold-200">{toast}</div>}
    </>
  );
}
