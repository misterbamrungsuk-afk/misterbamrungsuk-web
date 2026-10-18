"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CHECKIN_TIME, CHECKOUT_TIME, FREE_CANCEL_HOURS, STAY_LABEL, bahtTxt, cancelRule, freeCancelUntil, thDate, thTime, type StayBooking } from "@/lib/hotels/types";

const BD = "rgba(232,196,114,.38)";
const Row = ({ k, v, strong = false }: { k: string; v: React.ReactNode; strong?: boolean }) => (
  <div className="flex justify-between gap-3 py-1"><span className="text-[#d9c9b4]">{k}</span><span className={`text-right ${strong ? "font-lux font-semibold text-[#e8c472] text-[16px]" : ""}`}>{v}</span></div>
);

// รายละเอียดการจองห้อง + สรุปแบบใบเสร็จ + ยกเลิก (กล่องยืนยันในหน้า บอกกติกาคืนเงินก่อนกด)
export function StayDetail({ initial }: { initial: StayBooking }) {
  const [b, setB] = useState(initial);
  const [nowMs, setNow] = useState<number | null>(null);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);
  const rule = nowMs == null ? { can: false, refund: false } : cancelRule(b, nowMs);

  const cancel = async () => {
    setBusy(true); setErr("");
    const res = await fetch(`/api/hotels/bookings/${b.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel", expect_refund: rule.refund }) }).catch(() => null);
    const out = (await res?.json().catch(() => ({}))) as { ok?: boolean; booking?: StayBooking; error?: string } | undefined;
    setBusy(false); setAsk(false);
    if (!out?.ok || !out.booking) { setErr(out?.error ?? "ยกเลิกไม่สำเร็จ"); setNow(Date.now()); return; }
    setB(out.booking);
  };

  const refunded = b.refund_satang != null && b.refund_satang > 0;
  return (
    <div className="px-[18px] pt-4 pb-10 flex flex-col gap-3 text-[13.5px]">
      <div className="p-3.5 rounded-2xl bg-[#211a18]" style={{ border: `1px solid ${BD}` }}>
        <div className="text-[12px] text-[#b5a596]">สถานะ</div>
        <div className="font-lux font-semibold text-[17px]" style={{ color: b.status === "confirmed" ? "#7fd6a3" : b.status === "pending" ? "#e8c472" : "#f3ead9" }}>{STAY_LABEL[b.status]}</div>
        {b.status === "pending" && <div className="text-[12.5px] text-[#d9c9b4] mt-1">โรงแรมจะยืนยันภายใน {thTime(b.expires_at)} · ไม่ตอบ = คืนเงินเต็มอัตโนมัติ</div>}
        {b.decline_reason && ["declined", "expired", "refunded"].includes(b.status) && <div className="text-[12.5px] text-[#d9c9b4] mt-1">{b.decline_reason}</div>}
      </div>

      <section aria-label="ใบสรุปการจอง" className="p-3.5 rounded-2xl bg-[#211a18]" style={{ border: `1px solid ${BD}` }}>
        <div className="flex justify-between items-baseline"><b className="font-lux text-[15px]">ใบสรุปการจอง</b><span className="text-[12px] text-[#b5a596]">{b.code}</span></div>
        <div className="mt-2">
          <Row k="โรงแรม" v={b.partner_name} />
          <Row k="ห้อง" v={`${b.room_name} × ${b.rooms}`} />
          <Row k="ผู้เข้าพัก" v={`คุณ${b.guest_name} · ${b.guests} คน`} />
          <Row k="เช็กอิน" v={`${thDate(b.check_in)} · ${CHECKIN_TIME}`} />
          <Row k="เช็กเอาต์" v={`${thDate(b.check_out)} · ${CHECKOUT_TIME}`} />
          {b.note && <Row k="ฝากบอก" v={<span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{b.note}</span>} />}
        </div>
        <div className="mt-2 pt-2" style={{ borderTop: `1px dashed ${BD}` }}>
          <Row k={`${bahtTxt(b.price_satang)} × ${b.nights} คืน × ${b.rooms} ห้อง`} v={bahtTxt(b.total_satang)} />
          <Row k="ชำระจากกระเป๋า" v={bahtTxt(b.total_satang)} strong />
          {b.refund_satang != null && <Row k="คืนเข้ากระเป๋า" v={refunded ? bahtTxt(b.refund_satang) : "ไม่คืนเงิน (ยกเลิกหลังกำหนด)"} />}
        </div>
        <div className="mt-2 text-[11.5px] text-[#b5a596]">จองเมื่อ {thTime(b.created_at)}{b.confirmed_at ? ` · ยืนยันเมื่อ ${thTime(b.confirmed_at)}` : ""}{b.cancelled_at ? ` · ยกเลิกเมื่อ ${thTime(b.cancelled_at)}` : ""}</div>
      </section>

      {(b.status === "pending" || b.status === "confirmed") && (
        <section className="p-3.5 rounded-2xl bg-[#211a18] flex flex-col gap-2" style={{ border: `1px solid ${BD}` }}>
          <b className="font-lux text-[15px]">การยกเลิก</b>
          <p className="m-0 text-[12.5px] text-[#d9c9b4] leading-[1.6]">
            {b.status === "pending" ? "ยังรอโรงแรมยืนยัน · ยกเลิกได้และคืนเงินเต็ม" : `ยกเลิกฟรีถึง ${thTime(freeCancelUntil(b))} (${FREE_CANCEL_HOURS} ชม. ก่อนเช็กอิน) · หลังจากนั้นยกเลิกได้ถึงเวลาเช็กอินแต่ไม่คืนเงิน`}
          </p>
          {err && <p role="alert" className="m-0 text-[13px] text-[#ff9b9b]">{err}</p>}
          {rule.can && (ask ? (
            <div role="alertdialog" aria-label="ยืนยันยกเลิกการจอง" className="rounded-xl p-3 flex flex-col gap-2" style={{ border: `1px solid ${rule.refund ? "#e8c472" : "#ff9b9b"}` }}>
              <div>{rule.refund ? `ยกเลิกการจองนี้? คืน ${bahtTxt(b.total_satang)} เข้ากระเป๋าทันที` : `เลยเวลายกเลิกฟรีแล้ว · ยกเลิกตอนนี้จะไม่ได้รับเงินคืน ${bahtTxt(b.total_satang)} · ยืนยันยกเลิก?`}</div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} onClick={() => setAsk(false)} className="h-12 rounded-[14px] text-[#e8c472]" style={{ border: `1px solid ${BD}` }}>ไม่ยกเลิก</button>
                <button type="button" disabled={busy} onClick={cancel} className="btn-red-lux h-12 rounded-[14px] font-semibold text-white">{busy ? "กำลังยกเลิก…" : rule.refund ? "ยืนยันยกเลิก" : "ยกเลิกแบบไม่คืนเงิน"}</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => { setErr(""); setAsk(true); }} className="h-12 rounded-[14px] text-[#ff9b9b] font-semibold" style={{ border: "1px solid rgba(255,155,155,.5)" }}>ยกเลิกการจอง</button>
          ))}
        </section>
      )}

      <div className="flex gap-2">
        <Link href={`/hotels/${b.partner_id}`} className="flex-1 h-12 rounded-[14px] grid place-items-center text-[#e8c472] no-underline" style={{ border: `1px solid ${BD}` }}>ดูโรงแรม</Link>
        <Link href="/wallet" className="flex-1 h-12 rounded-[14px] grid place-items-center text-[#e8c472] no-underline" style={{ border: `1px solid ${BD}` }}>กระเป๋าเงิน</Link>
      </div>
      <p className="m-0 text-[11.5px] text-[#b5a596] leading-[1.6]">เงินพักไว้กับ Mister Bamrungsuk และโอนให้โรงแรมหลังวันเช็กเอาต์ · มีปัญหาติดต่อทีมงานผ่านเมนูช่วยเหลือ</p>
    </div>
  );
}
