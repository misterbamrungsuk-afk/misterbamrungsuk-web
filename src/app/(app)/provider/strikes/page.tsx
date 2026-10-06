"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Toast } from "@/components/ui";
import { NOSHOW_RULES_TH } from "@/lib/noshow-rules";
import { BASE_SCORE, DEMO_STRIKE_EVENTS, STRIKE_DEDUCTION, STRIKE_EXPIRE_DAYS, evaluateStrikes, strikeStatus } from "@/lib/strikes";
import { site } from "@/lib/site";
import { DEMO_ME } from "@/lib/demo-data";

const STRIKE_LIMIT = site.strikeLimit;
type ApiStrike = { id: string; provider_id: string; reason: string; ref: string | null; points: number; created_at: string };
type Item = { id: string; reason: string; note: string; ref?: string; at: string; expiresAt: string; points: number };
const REASON_TH: Record<string, string> = { no_show: "ไม่มาตามนัด" };
const addDays = (iso: string, d: number) => new Date(new Date(iso).getTime() + d * 86400_000).toISOString();

export default function StrikesPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState("");
  // ใบเตือนจริงจากการตัดสินของแอดมิน (provider_strikes) + ข้อมูลเดโมเมื่ออยู่ในโหมดเดโม
  const [real, setReal] = useState<ApiStrike[]>([]);
  const [demoMode, setDemoMode] = useState(true);
  useEffect(() => {
    fetch(`/api/provider/strikes?provider=${encodeURIComponent(DEMO_ME.id)}`, { cache: "no-store" })
      .then((r) => r.json()).then((d: { ok?: boolean; demo?: boolean; strikes?: ApiStrike[] }) => { if (d.ok) { setReal(d.strikes ?? []); setDemoMode(!!d.demo); } })
      .catch(() => {});
  }, []);
  const demoEv = evaluateStrikes("คุณ", DEMO_STRIKE_EVENTS);
  const now = Date.now();
  const items: Item[] = [
    ...real.map((s) => ({ id: s.id, reason: REASON_TH[s.reason] ?? s.reason, note: `${REASON_TH[s.reason] ?? s.reason}${s.ref ? ` · ${s.ref}` : ""}`, at: s.created_at, expiresAt: addDays(s.created_at, STRIKE_EXPIRE_DAYS), points: s.points || STRIKE_DEDUCTION })),
    ...(demoMode ? demoEv.strikes.map((s) => ({ ...s, note: `${DEMO_STRIKE_EVENTS.find((e) => e.id === s.id)?.note ?? s.reason}${s.ref ? ` · ${s.ref}` : ""}`, points: STRIKE_DEDUCTION })) : []),
  ].filter((s) => Date.parse(s.expiresAt) > now).sort((a, b) => b.at.localeCompare(a.at));
  const total = items.length;
  const count = Math.min(total, STRIKE_LIMIT);
  const ev = { count, total, banned: total >= STRIKE_LIMIT, status: strikeStatus(count), score: Math.max(0, BASE_SCORE - items.reduce((n, s) => n + s.points, 0)) };
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok" });

  const submit = () => {
    setSent(true);
    setToast(th ? "ส่งคำอุทธรณ์แล้ว · ทีมงานตอบภายใน 48 ชม." : "Appeal sent · reply within 48h");
    setTimeout(() => setToast(""), 2400);
  };

  return (
    <>
      <TopBar back="/provider" title={th ? "ใบเตือน" : "Strikes"} />
      <div className="px-4 py-4 space-y-4 pb-8">
        <div className={`glass rounded-3xl p-5 text-center ${ev.banned ? "border-crimson-500/60" : ""}`}>
          <span className={`chip ${ev.status.kind === "ok" ? "" : ev.status.kind === "warned" ? "chip-gold" : "chip-red"}`}>
            {th ? ev.status.label : ev.status.kind === "ok" ? "Good standing" : ev.status.kind === "warned" ? `Warned ${ev.count}/${STRIKE_LIMIT}` : "Suspended"}
          </span>
          <p className="font-display text-4xl font-bold mt-2"><span className="text-crimson-400">{ev.count}</span><span className="text-ink-500">/{STRIKE_LIMIT}</span></p>
          <p className="text-xs text-ink-400 mt-1">{th ? `ใบเตือนที่มีผลทั้งหมด ${ev.total} ใบ · ครบ ${STRIKE_LIMIT} ระงับบัญชี` : `${ev.total} active strikes · ${STRIKE_LIMIT} = suspension`}</p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {Array.from({ length: STRIKE_LIMIT }, (_, i) => <div key={i} className={`h-2 rounded-full ${i < ev.count ? "bg-crimson-500" : "bg-ink-700"}`} />)}
          </div>
          <p className="text-sm mt-3">{th ? "คะแนนความประพฤติ" : "Conduct score"} <b className="text-gold-400">{ev.score}</b><span className="text-ink-500">/{BASE_SCORE}</span></p>
          <p className="text-xs text-ink-400 mt-2">{th ? `รีวิว 1 ดาว หรือถูกรายงานไม่เหมาะสม = 1 strike (หัก ${STRIKE_DEDUCTION} คะแนน แจ้งแอดมินอัตโนมัติ) · ครบ ${STRIKE_LIMIT} ระงับบัญชี · หมดอายุใน ${STRIKE_EXPIRE_DAYS} วัน` : `1-star review or inappropriate report = 1 strike (−${STRIKE_DEDUCTION} pts, admin notified) · ${STRIKE_LIMIT} = suspension · expire after ${STRIKE_EXPIRE_DAYS} days`}</p>
        </div>

        <div className="glass rounded-3xl p-4 space-y-2">
          <p className="font-semibold text-sm">{th ? "กติกาผิดนัด (No-show)" : "No-show rules"}</p>
          {NOSHOW_RULES_TH.map(([h, b]) => (
            <div key={h} className="text-xs"><b className="text-gold-300">{h}</b><p className="text-ink-300 mt-0.5 leading-relaxed">{b}</p></div>
          ))}
        </div>

        {items.length === 0 && <p className="text-center text-sm text-ink-400">{th ? "ไม่มีใบเตือนที่ยังมีผล" : "No active strikes"}</p>}
        {items.map((s) => (
          <div key={s.id} className="glass rounded-3xl p-4 border-crimson-500/30">
            <div className="flex items-center justify-between gap-2">
              <span className="chip chip-red">{s.reason}</span>
              <span className="text-[11px] text-ink-400">{fmt(s.at)}</span>
            </div>
            <p className="text-sm mt-2">{s.note}</p>
            <p className="text-xs text-ink-400 mt-1">{th ? `หัก ${s.points} คะแนน · หมดอายุ` : `−${s.points} pts · Expires`} {fmt(s.expiresAt)} ({STRIKE_EXPIRE_DAYS} {th ? "วัน" : "days"})</p>
          </div>
        ))}

        {sent ? (
          <div className="glass rounded-3xl p-5 text-center">
            <p className="text-3xl">📨</p>
            <p className="font-semibold mt-2">{th ? "อยู่ระหว่างพิจารณา" : "Under review"}</p>
            <p className="text-xs text-ink-400 mt-1">{th ? "เราจะแจ้งผลทางแชท" : "We will notify you in chat"}</p>
          </div>
        ) : (
          <div className="glass rounded-3xl p-4 space-y-3">
            <p className="font-semibold text-sm">{th ? "ยื่นอุทธรณ์" : "Appeal"}</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} className="input-dark h-28 resize-none w-full"
              placeholder={th ? "อธิบายเหตุผล เช่น รถติดจากอุบัติเหตุ แจ้งลูกค้าแล้ว" : "Explain what happened"} aria-label={th ? "เหตุผล" : "Reason"} />
            <label className="flex items-center gap-3 rounded-2xl border border-dashed border-ink-600 p-3 cursor-pointer">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="w-14 h-14 rounded-xl object-cover" />
              ) : <span className="w-14 h-14 rounded-xl grid place-items-center bg-ink-850 text-2xl">📷</span>}
              <span className="text-sm text-ink-300">{photo ? (th ? "เปลี่ยนรูป" : "Change photo") : th ? "แนบหลักฐาน (ไม่บังคับ)" : "Attach evidence (optional)"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)); }} />
            </label>
            <button onClick={submit} disabled={text.trim().length < 5} className="btn-crimson w-full h-12 font-semibold">
              {text.trim().length < 5 ? (th ? "กรอกเหตุผลก่อน" : "Enter a reason") : th ? "ส่งอุทธรณ์" : "Submit appeal"}
            </button>
          </div>
        )}
      </div>
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
