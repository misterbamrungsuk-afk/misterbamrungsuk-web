"use client";

// ใช้ร่วมกัน: หน้าการจอง + หน้าระหว่างนัด — แผ่นล่าง · ต่อเวลา +1 ชม. (ส่งคำขอ / ยกเลิกคำขอที่รอเพื่อนตอบ)
import { useEffect, useState } from "react";
import Link from "next/link";

export const GOLD = "#e8c472";
export const LN = "rgba(243,234,217,0.07)";
export const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US");
export const fmt = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export type Chg = { id: string; kind: "reschedule" | "extend"; status: "pending" | "accepted" | "declined" | "expired" | "failed" | "cancelled"; old_starts_at: string | null; new_starts_at: string | null; hours: number; amount_satang: number; reason: string | null; expires_at: string; created_at: string; decided_at: string | null };
export type CI = { changes: Chg[]; pending: Chg | null; extra_hours: number; hourly_satang: number; can_reschedule: string | null; can_extend: string | null; rules: { rescheduleMinHours: number; rescheduleWaitHours: number; extendMaxHours: number } } | null;

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="ปิด" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-[480px] rounded-t-[24px] bg-[#211a18] flex flex-col gap-3 max-h-[88dvh] overflow-y-auto" style={{ padding: "16px 16px calc(18px + env(safe-area-inset-bottom))", borderTop: `1px solid ${LN}` }}>
        <div className="flex items-center justify-between gap-3"><b className="font-semibold text-[16px]">{title}</b><button type="button" onClick={onClose} aria-label="ปิด" className="w-10 h-10 rounded-full grid place-items-center text-[#d9c9b4]">✕</button></div>
        {children}
      </div>
    </div>
  );
}

/** ส่งคำขอต่อเวลา +1 ชม. (ตัดเงินเมื่อเพื่อนรับ) */
export function ExtendSheet({ id, ch, onClose, onDone }: { id: string; ch: NonNullable<CI>; onClose: () => void; onDone: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ t: string; topup?: boolean } | null>(null);
  const send = async () => {
    setBusy(true); setErr(null);
    const r = await fetch(`/api/bookings/${id}/extend`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (!d?.ok) return setErr({ t: d?.error || "ส่งไม่สำเร็จ กรุณาลองใหม่", topup: r?.status === 402 });
    onDone("ส่งคำขอต่อเวลาแล้ว · ตัดเงินเมื่อเพื่อนรับ");
  };
  return (
    <Sheet title="ต่อเวลา +1 ชม.?" onClose={onClose}>
      {ch.can_extend ? <p className="m-0 rounded-2xl text-[14px]" style={{ padding: 14, background: "#251d1b" }}>{ch.can_extend}</p> : (
        <div className="rounded-2xl text-[14px] flex flex-col gap-1" style={{ padding: 14, background: "#251d1b" }}>
          <span>ค่าบริการเพิ่ม <b style={{ color: GOLD }}>{baht(ch.hourly_satang)}</b> / ชม.</span>
          <span className="text-[12.5px] font-light text-[#d9c9b4]">ตัดจากกระเป๋าเมื่อเพื่อนรับ · พักไว้กับเราจนจบนัดเหมือนค่านัด · ต่อได้ทีละ 1 ชม. รวมไม่เกิน {ch.rules.extendMaxHours} ชม. (ต่อแล้ว {ch.extra_hours} ชม.) · ถ้าคุณจบนัดก่อนเพื่อนรับ คืนเงินส่วนนี้อัตโนมัติ</span>
        </div>
      )}
      {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err.t}{err.topup && <> · <Link href="/wallet" className="underline" style={{ color: GOLD }}>เติมเงิน</Link></>}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} className="h-12 rounded-[14px] text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}>ไม่ต่อ</button>
        <button type="button" disabled={busy || !!ch.can_extend} onClick={send} className="h-12 rounded-[14px] font-semibold text-[#1b130b] disabled:opacity-45" style={{ background: GOLD }}>{busy ? "กำลังส่ง…" : "ขอต่อเวลา"}</button>
      </div>
    </Sheet>
  );
}

/** การ์ดคำขอที่รอเพื่อนตอบ + ปุ่มยกเลิกคำขอ (ยืนยันในหน้า) */
export function PendingChange({ id, c, startsAt, onDone }: { id: string; c: Chg; startsAt: string; onDone: (msg: string) => void }) {
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const re = c.kind === "reschedule";
  const cancel = async () => {
    setBusy(true); setErr("");
    const r = await fetch(`/api/bookings/${id}/${c.kind}`, { method: "DELETE" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (!d?.ok) { setAsk(false); return setErr(d?.error || "ยกเลิกไม่สำเร็จ กรุณาลองใหม่"); }
    onDone(re ? "ยกเลิกคำขอเปลี่ยนเวลาแล้ว · นัดยังเป็นเวลาเดิม" : "ยกเลิกคำขอต่อเวลาแล้ว · ไม่มีการตัดเงิน");
  };
  return (
    <div className="rounded-[20px] flex flex-col gap-1" style={{ padding: 14, border: `1px solid ${GOLD}`, background: "rgba(232,196,114,0.08)" }}>
      <b className="font-semibold text-[15px]">{re ? "รอเพื่อนตอบคำขอเปลี่ยนเวลา" : "รอเพื่อนตอบคำขอต่อเวลา +1 ชม."}</b>
      <span className="text-[13px] font-light text-[#d9c9b4]">{re ? `${fmt(c.old_starts_at ?? startsAt)} → ${fmt(c.new_starts_at!)} · นัดยังเป็นเวลาเดิมจนเพื่อนรับ` : `ค่าบริการเพิ่ม ${baht(c.amount_satang)} · ตัดจากกระเป๋าเมื่อเพื่อนรับ`}</span>
      <span className="text-[12px] font-light text-[#b5a596]">เพื่อนตอบได้ถึง {fmt(c.expires_at)} · ไม่ตอบ = ไม่มีอะไรเปลี่ยน</span>
      {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
      {ask ? (
        <div role="dialog" aria-label="ยืนยันยกเลิกคำขอ" className="flex flex-col gap-2 mt-1">
          <span className="text-[13px] text-[#f3ead9]">{re ? "ยกเลิกคำขอนี้? นัดคงเวลาเดิม · ขอเปลี่ยนเวลาใหม่ได้ภายหลัง" : "ยกเลิกคำขอนี้? ไม่มีการตัดเงิน"}</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAsk(false)} className="h-11 rounded-xl text-[13px] text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}>กลับไปก่อน</button>
            <button type="button" disabled={busy} onClick={cancel} className="h-11 rounded-xl text-[13px] font-semibold text-[#ff8a9a] disabled:opacity-50" style={{ background: "rgba(201,40,61,.16)" }}>{busy ? "กำลังยกเลิก…" : "ยืนยันยกเลิกคำขอ"}</button>
          </div>
        </div>
      ) : <button type="button" onClick={() => setAsk(true)} className="self-start min-h-10 mt-1 px-3 rounded-full text-[13px] text-[#ff8a9a]" style={{ border: "1px solid rgba(255,138,154,.4)" }}>ยกเลิกคำขอ</button>}
    </div>
  );
}
