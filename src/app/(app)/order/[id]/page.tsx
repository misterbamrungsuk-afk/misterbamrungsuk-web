"use client";
/* eslint-disable @next/next/no-img-element */

// รายละเอียดการจอง (บอร์ด C-OrderDetail + C-Escrow "เงินของคุณอยู่ตรงไหน") — สถานะ · เงิน · แชท · ยกเลิก
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LiveTrack } from "@/components/live-track";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US");
type B = { id: string; code: string; status: string; starts_at: string; hours: number; price_satang: number; room_fee_satang: number; total_satang: number; note: string | null; place: { label: string; detail: string }; decline_reason: string | null; expires_at: string | null; created_at: string; cancel_refund_pct?: number | null; resolution?: { refund_pct?: number; refund_satang?: number } | null; pt: { pid: string; nick: string; img: string } };
const MONEY: Record<string, [string, string]> = {
  requested: ["กันไว้ในกระเป๋าของคุณ", "รอเพื่อนตอบรับ · ไม่ตอบใน 30 นาทีคืนอัตโนมัติ"],
  accepted: ["พักไว้กับ Mister Bamrungsuk", "โอนให้เพื่อนหลังจบนัด · มีปัญหาแจ้งเราได้ก่อนเงินถูกปล่อย"],
  checked_in: ["พักไว้กับ Mister Bamrungsuk", "ระหว่างนัด · โอนให้เพื่อนหลังจบนัด"],
  cancel_requested: ["พักไว้กับ Mister Bamrungsuk", "ทีมงานกำลังพิจารณาคำขอยกเลิกตามกติกา"],
  disputed: ["พักไว้กับ Mister Bamrungsuk", "ทีมงานกำลังตรวจสอบเรื่องที่แจ้ง"],
  completed: ["โอนให้เพื่อนแล้ว", "นัดเสร็จสิ้น"],
  declined: ["คืนเข้ากระเป๋าแล้ว", "เพื่อนไม่สะดวกนัดนี้"], expired: ["คืนเข้ากระเป๋าแล้ว", "เพื่อนไม่ได้ตอบรับภายในเวลา"], cancelled: ["คืนเข้ากระเป๋าแล้ว", "ยกเลิกก่อนเพื่อนตอบรับ"], refunded: ["คืนเข้ากระเป๋าแล้ว", "ทีมงานคืนเงินให้แล้ว"],
};
const fmt = (iso: string) => new Date(iso).toLocaleString("th-TH", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [b, setB] = useState<B | null>(null);
  const [err, setErr] = useState("");
  const [cancel, setCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const load = useCallback(() => fetch(`/api/bookings/${id}`, { cache: "no-store" }).then((r) => r.json()).then((d) => (d?.ok ? setB(d.booking) : setErr(d?.error || "ไม่พบการจอง"))).catch(() => setErr("โหลดไม่สำเร็จ")), [id]);
  useEffect(() => { load(); }, [load]);
  const doCancel = async () => {
    setBusy(true);
    const r = await fetch(`/api/bookings/${id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false); setCancel(false);
    setMsg(d?.ok ? (["cancelled", "refunded", "completed"].includes(d.status) ? "ยกเลิกแล้ว · คืนเงินตามกติกาเข้ากระเป๋าแล้ว" : "ส่งคำขอยกเลิกแล้ว · ทีมงานจะพิจารณาตามกติกา") : d?.error || "ยกเลิกไม่สำเร็จ");
    load();
  };

  const head = (
    <div className="flex items-center gap-3 h-16 px-4" style={{ background: "#251d1b" }}>
      <Link href="/orders" aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full bg-[#211a18] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
      <h1 className="m-0 font-semibold text-[18px]">รายละเอียดการจอง</h1>
    </div>
  );
  if (err) return <div>{head}<p className="text-center text-[#ff8a9a]" style={{ padding: 40 }}>{err}</p></div>;
  if (!b) return <div>{head}<p className="text-center text-[#b5a596]" style={{ padding: 40 }}>กำลังโหลด…</p></div>;
  const rs = b.resolution?.refund_pct;
  const money: [string, string] = rs && rs < 100 ? [`คืน ${baht(b.resolution?.refund_satang ?? 0)} เข้ากระเป๋าแล้ว`, `ยกเลิก/พิจารณาแล้ว · คืน ${rs}% ส่วนที่เหลือโอนให้เพื่อน`] : (MONEY[b.status] ?? ["—", ""]) as [string, string];
  const chatOpen = ["requested", "accepted", "checked_in", "cancel_requested"].includes(b.status);
  const canCancel = b.status === "requested" || b.status === "accepted";

  return (
    <div className="pb-[140px] min-h-dvh" style={{ background: "#171211" }}>
      {head}
      <main className="flex flex-col gap-4" style={{ padding: "16px 16px 0" }}>
        {msg && <p role="status" className="m-0 rounded-xl text-[13px]" style={{ padding: "10px 14px", background: "rgba(232,196,114,0.14)", color: GOLD }}>{msg}</p>}
        <div className="flex gap-3 items-center rounded-[20px] bg-[#211a18]" style={{ padding: 14, border: `1px solid ${LN}` }}>
          <img src={b.pt.img} alt="" className="w-14 h-14 rounded-full object-cover" />
          <div className="flex-1 min-w-0"><b className="font-medium text-[17px]">{b.pt.nick}</b><div className="text-[12px] font-light text-[#d9c9b4]">#{b.code} · จองเมื่อ {fmt(b.created_at)}</div></div>
          <Link href={`/p/${b.pt.pid}`} className="tap px-1 text-[13px] font-light" style={{ color: GOLD }}>โปรไฟล์</Link>
        </div>
        {(b.status === "accepted" || b.status === "checked_in") && <LiveTrack id={b.id} nick={b.pt.nick} img={b.pt.img} startsAt={b.starts_at} />}
        <div className="rounded-[20px] bg-[#211a18] text-[14px]" style={{ padding: "4px 16px", border: `1px solid ${LN}` }}>
          {[["วันเวลา", `${fmt(b.starts_at)} (${b.hours} ชม.)`], ["สถานที่", `${b.place.label} ${b.place.detail}`], ...(b.note ? [["ฝากบอก", b.note]] : []), ["ค่าบริการ", baht(b.price_satang)], ...(b.room_fee_satang ? [["ค่าห้อง", baht(b.room_fee_satang)]] : [])].map(([k, v], i, a) => (
            <div key={k} className="flex justify-between gap-3 py-[10px]" style={{ borderBottom: i < a.length - 1 ? `1px solid ${LN}` : "none" }}><span className="text-[#d9c9b4] shrink-0">{k}</span><span className="text-right">{v}</span></div>
          ))}
        </div>
        <div className="rounded-[20px] flex gap-3 items-start" style={{ padding: 14, border: "1px solid rgba(212,175,55,.4)", background: "rgba(212,175,55,.06)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" aria-hidden="true" className="shrink-0 mt-0.5"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          <div className="flex-1"><div className="text-[13px] font-light text-[#d9c9b4]">เงินของคุณ {baht(b.total_satang)}</div><b className="font-semibold" style={{ color: GOLD }}>{money[0]}</b><div className="text-[12.5px] font-light text-[#d9c9b4]">{money[1]}{b.decline_reason && (b.status === "declined") ? ` · ${b.decline_reason}` : ""}</div></div>
        </div>
        <div className="flex justify-between text-[13px] font-light">
          {["accepted", "checked_in", "completed", "refunded", "cancel_requested", "disputed"].includes(b.status) ? <Link href={`/order/${b.id}/receipt`} className="tap" style={{ color: GOLD }}>ใบเสร็จ / ใบกำกับภาษี ›</Link> : <span />}
          <Link href={`/report?booking=${b.id}&nick=${encodeURIComponent(b.pt.nick)}`} className="tap text-[#d9c9b4] hover:text-[#f3ead9]">รายงานผู้ใช้</Link>
        </div>
        {cancel && (
          <div className="rounded-[20px] bg-[#211a18] flex flex-col gap-3" style={{ padding: 14, border: "1px solid rgba(255,138,154,.4)" }}>
            <b className="font-semibold">{b.status === "requested" ? "ยกเลิกคำขอนี้?" : "ขอยกเลิกนัดที่ยืนยันแล้ว?"}</b>
            <span className="text-[13px] font-light text-[#d9c9b4]">{b.status === "requested" ? "เพื่อนยังไม่ตอบรับ · คืนเงินเข้ากระเป๋าทันที" : b.cancel_refund_pct != null ? `ตามกติกา คืนเงิน ${b.cancel_refund_pct}% = ${baht(Math.round(b.total_satang * b.cancel_refund_pct / 100))} เข้ากระเป๋าทันที` : "ทีมงานจะพิจารณาตามกติกาการยกเลิกและแจ้งผลยอดคืน"}</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="เหตุผล (ไม่บังคับ)" className="h-12 rounded-xl bg-[#251d1b] px-[14px] text-[16px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]" />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setCancel(false)} className="h-12 rounded-[14px] text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}>ไม่ยกเลิก</button>
              <button type="button" disabled={busy} onClick={doCancel} className="h-12 rounded-[14px] font-semibold text-[#ff8a9a] disabled:opacity-50" style={{ background: "rgba(201,40,61,.16)" }}>{busy ? "กำลังยกเลิก…" : "ยืนยันยกเลิก"}</button>
            </div>
          </div>
        )}
      </main>
      <div className="fixed left-0 right-0 bottom-0 mx-auto max-w-[480px] flex flex-col gap-2 z-40" style={{ padding: "12px 16px calc(18px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(23,18,17,0), #171211 25%)" }}>
        {(b.status === "checked_in" || (b.status === "accepted" && Date.parse(b.starts_at) - Date.now() < 2 * 3600_000)) && <Link href={`/order/${b.id}/session`} className="h-12 rounded-[14px] text-[14px] grid place-items-center hover:text-[#e8c472]" style={{ border: "1px solid rgba(232,196,114,.55)", color: GOLD }}>เปิดหน้าระหว่างนัด (เวลา · SOS)</Link>}
        {(b.status === "checked_in" || (b.status === "accepted" && Date.parse(b.starts_at) <= Date.now())) && <Link href={`/order/${b.id}/complete`} className="h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">ยืนยันจบนัดและให้คะแนน</Link>}
        {(b.status === "accepted" || b.status === "checked_in") && <Link href={`/order/${b.id}/dispute`} className="h-12 rounded-[14px] text-[14px] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}>มีปัญหา? แจ้งเรา</Link>}
        {chatOpen && <Link href={`/chat/${b.id}`} className="h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">แชทกับ{b.pt.nick}</Link>}
        {canCancel && !cancel && <button type="button" onClick={() => setCancel(true)} className="h-12 rounded-[14px] text-[14px] text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}>{b.status === "requested" ? "ยกเลิกคำขอ" : "ยกเลิก / เปลี่ยนเวลา"}</button>}
        {!chatOpen && !canCancel && <Link href={`/book/${b.pt.pid}`} className="h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">จองอีกครั้ง</Link>}
      </div>
    </div>
  );
}
