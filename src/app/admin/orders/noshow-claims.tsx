"use client";

import { useEffect, useState } from "react";
import { baht } from "@/components/ui";
import { site } from "@/lib/site";
import { CLAIM_STATUS_LABEL, NOSHOW_DECISION_HOURS, NOSHOW_POINTS, PAYOUT_PERCENT, type Evidence, type NoShowClaim } from "@/lib/noshow-rules";
import { Card, Pill } from "../admin-nav";

const km = (a: Evidence["gps"], b: Evidence["gps"]) => {
  if (!a || !b) return null;
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const time = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Side({ title, ev }: { title: string; ev: Evidence | null }) {
  return (
    <div className="rounded-xl bg-ink-700 p-3 text-sm flex flex-col gap-1.5 min-w-0">
      <b className="font-display">{title}</b>
      {!ev ? <p className="text-ink-300">ยังไม่ส่งหลักฐาน</p> : (
        <>
          <p className="text-ink-300 text-xs">ส่งเมื่อ {time(ev.at)}</p>
          {ev.arrival && (
            <p>🚩 ถึงจุดนัด {time(ev.arrival.at)} <span className="text-ink-300 text-xs">(รอ {Math.round((Date.parse(ev.at) - Date.parse(ev.arrival.at)) / 60_000)} นาทีก่อนแจ้ง)</span>
              {" · "}{ev.arrival.gps ? <a className="text-gold-300 underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${ev.arrival.gps.lat},${ev.arrival.gps.lng}`}>{ev.arrival.gps.lat.toFixed(5)}, {ev.arrival.gps.lng.toFixed(5)}</a> : <span className="text-crimson-200">ไม่มี GPS ตอนถึง{ev.arrival.gpsError ? ` (${ev.arrival.gpsError})` : ""}</span>}
            </p>
          )}
          <p>📍 {ev.gps ? <a className="text-gold-300 underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${ev.gps.lat},${ev.gps.lng}`}>{ev.gps.lat.toFixed(5)}, {ev.gps.lng.toFixed(5)}</a> : <span className="text-crimson-200">ไม่มี GPS{ev.gpsError ? ` (${ev.gpsError})` : ""}</span>}{ev.gps && <span className="text-ink-300"> ±{ev.gps.accuracy} ม.</span>}</p>
          <p>📞 ติดต่อ {ev.attempts} ครั้ง <span className="text-ink-300 text-xs">({ev.attemptsSource === "chat_log" ? "จากแชทในแอป" : "กรอกเอง"})</span></p>
          {ev.note && <p className="text-ink-200">“{ev.note}”</p>}
          {ev.photo ? (
            <a href={`/api/admin/noshow?photo=${encodeURIComponent(ev.photo)}`} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/admin/noshow?photo=${encodeURIComponent(ev.photo)}`} alt="หลักฐาน" className="w-full max-h-40 object-cover rounded-lg mt-1" />
            </a>
          ) : <p className="text-ink-300 text-xs">ไม่มีรูป</p>}
        </>
      )}
    </div>
  );
}

// คำร้องผิดนัด — เทียบหลักฐานสองฝ่าย แล้วตัดสิน (เงินพักไว้จนกว่าจะตัดสิน)
export function NoShowClaims({ onToast }: { onToast: (m: string) => void }) {
  const [claims, setClaims] = useState<NoShowClaim[] | null>(null);
  const [busy, setBusy] = useState("");

  const load = () => fetch("/api/admin/noshow").then((r) => r.json()).then((d: { claims?: NoShowClaim[] }) => setClaims(d.claims ?? [])).catch(() => setClaims([]));
  useEffect(() => { load(); }, []);

  const decide = async (c: NoShowClaim, decision: "customer_no_show" | "provider_no_show") => {
    const msg = decision === "customer_no_show"
      ? `ยืนยัน: ลูกค้าไม่มา → จ่าย Part-Time ${PAYOUT_PERCENT}% (${baht(Math.round(c.amount * PAYOUT_PERCENT / 100))})`
      : `ยืนยัน: Part-Time ไม่มา → คืนลูกค้า 100% (${baht(c.amount)}) + strike 1 + หัก ${NOSHOW_POINTS} คะแนน`;
    if (!window.confirm(msg)) return;
    setBusy(c.id);
    const r = await fetch("/api/admin/noshow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, decision }) });
    const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setBusy("");
    onToast(d.ok ? `ตัดสิน ${c.booking_id} แล้ว` : d.error || "ไม่สำเร็จ");
    load();
  };

  if (!claims) return <Card><p className="text-ink-300 text-center py-8">กำลังโหลด…</p></Card>;
  if (!claims.length) return <Card><p className="text-ink-300 text-center py-8">ยังไม่มีคำร้องผิดนัด</p></Card>;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink-300">ตรวจหลักฐานทั้งสองฝ่ายภายใน {NOSHOW_DECISION_HOURS} ชม. · ระหว่างนี้เงินพักไว้ ยังไม่จ่าย/คืนใคร · ค่าธรรมเนียม {site.commissionPercent}%</p>
      {claims.map((c) => {
        const d = km(c.provider_evidence?.gps ?? null, c.customer_evidence?.gps ?? null);
        const pending = c.status === "pending";
        return (
          <Card key={c.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <b className="font-display font-semibold text-lg">{c.booking_id} · {baht(c.amount)}</b>
              <span className="flex gap-1.5">
                {c.on_hold && <Pill tone="gold">เงินพักไว้</Pill>}
                <Pill tone={pending ? "gold" : "green"}>{CLAIM_STATUS_LABEL[c.status]}</Pill>
              </span>
            </div>
            <p className="text-sm text-ink-300">{c.customer_name} → {c.provider_name} · เปิดเรื่อง {time(c.created_at)}{d != null && <> · ระยะห่างจุด GPS สองฝ่าย <b className={d > 0.5 ? "text-crimson-200" : "text-gold-300"}>{d < 1 ? `${Math.round(d * 1000)} ม.` : `${d.toFixed(1)} กม.`}</b></>}</p>
            <div className="grid md:grid-cols-2 gap-2">
              <Side title="ฝั่ง Part-Time (แจ้งลูกค้าไม่มา)" ev={c.provider_evidence} />
              <Side title="ฝั่งลูกค้า (แจ้งเพื่อนไม่มา)" ev={c.customer_evidence} />
            </div>
            {pending ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <button disabled={!!busy} onClick={() => decide(c, "customer_no_show")} className="flex-1 h-11 rounded-xl border border-gold-500 text-gold-300 disabled:opacity-40">ลูกค้าไม่มา · จ่าย Part-Time {PAYOUT_PERCENT}%</button>
                <button disabled={!!busy} onClick={() => decide(c, "provider_no_show")} className="flex-1 h-11 rounded-xl bg-crimson-500 text-white font-semibold disabled:opacity-40">Part-Time ไม่มา · คืน 100% + strike</button>
              </div>
            ) : (
              <p className="text-sm text-ink-200">
                {c.status === "customer_no_show" ? `จ่าย Part-Time ${baht(c.payout_amount ?? 0)} (${PAYOUT_PERCENT}%)` : `คืนลูกค้า ${baht(c.refund_amount ?? 0)} (100%) · strike +1 · หัก ${c.points_deducted} คะแนน`}
                <span className="text-ink-300"> · โดย {c.decided_by} {c.decided_at ? time(c.decided_at) : ""}</span>
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
