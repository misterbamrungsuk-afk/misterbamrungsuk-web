"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { baht } from "@/components/ui";
import { DEMO_MY_ORDERS, DEMO_POSTS } from "@/lib/demo-data";

// ยกเลิกการจอง: คืนเต็มถ้ายกเลิกก่อนนัด ≥ 3 ชม. น้อยกว่านั้นคืน 50%
const FREE_HOURS = 3;
const HOURS_LEFT = 5 + 20 / 60; // เดโม: เหลือเวลาก่อนนัด 5 ชม. 20 นาที
const REASONS = { th: ["ติดธุระ ไม่สะดวกเวลานี้", "จองผิดวันหรือเวลา", "หมอขอให้ยกเลิก", "อื่นๆ"], en: ["Something came up", "Wrong date or time", "Therapist asked to cancel", "Other"] };

export default function CancelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useI18n();
  const th = lang === "th";
  const order = DEMO_MY_ORDERS.find((o) => o.id === id) ?? DEMO_MY_ORDERS[1];
  const post = DEMO_POSTS.find((p) => p.member.id === order.provider.id);
  const [reason, setReason] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const paid = order.totalAmount - order.discount;
  const free = HOURS_LEFT >= FREE_HOURS;
  const refund = free ? paid : Math.round(paid / 2);
  const fee = paid - refund;
  const h = Math.floor(HOURS_LEFT);
  const m = Math.round((HOURS_LEFT - h) * 60);
  const pos = Math.min(1, Math.max(0, 1 - HOURS_LEFT / 8)); // ตำแหน่งบนแถบ (8 ชม. ก่อนนัด → นัด)

  if (done) {
    return (
      <main className="px-6 pt-20 pb-8 flex flex-col items-center text-center gap-3 min-h-dvh">
        <div className="w-20 h-20 rounded-full border border-ink-600 grid place-items-center text-ink-200 text-3xl">✓</div>
        <h1 className="text-2xl font-semibold">{th ? "ยกเลิกการจองแล้ว" : "Booking cancelled"}</h1>
        <p className="text-sm text-ink-300">{th ? `คืนเงิน ${baht(refund)} เข้าช่องทางเดิมภายใน 1–3 วันทำการ` : `${baht(refund)} refunded to your original method in 1–3 business days`}</p>
        <div className="w-full flex flex-col gap-2 mt-6">
          <Link href="/home" className="btn-crimson h-14 rounded-2xl font-display font-semibold flex items-center justify-center">{th ? "หาหมอนวดคนใหม่" : "Find another therapist"}</Link>
          <Link href="/orders" className="h-12 rounded-2xl border border-ink-600 flex items-center justify-center">{th ? "ออเดอร์ของฉัน" : "My orders"}</Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <TopBar back="/orders" title={th ? "ยกเลิกการจอง" : "Cancel booking"} right={<span />} />
      <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
        <section className="rounded-2xl border border-ink-600 bg-ink-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={order.provider.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
            <div className="flex-1 min-w-0"><p className="font-medium truncate">{order.provider.name} · {order.id.toUpperCase()}</p><p className="text-xs text-ink-300">{th ? `เหลือ ${h} ชม. ${m} นาทีก่อนนัด` : `${h}h ${m}m before appointment`}</p></div>
          </div>
          <div className="relative h-1.5 rounded-full bg-ink-600" aria-hidden="true">
            <div className="absolute inset-y-0 left-0 rounded-full bg-gold-500" style={{ width: `${((8 - FREE_HOURS) / 8) * 100}%` }} />
            <div className="absolute inset-y-0 right-0 rounded-full bg-crimson-500/70" style={{ width: `${(FREE_HOURS / 8) * 100}%` }} />
            <span className="absolute -top-1.5 w-[18px] h-[18px] -ml-[9px] rounded-full bg-ink-100 border-[3px] border-gold-500" style={{ left: `${pos * 100}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-ink-300 mt-2"><span>{th ? "คืนเต็ม 100%" : "Full refund"}</span><span>{th ? `ก่อนนัด ${FREE_HOURS} ชม.` : `${FREE_HOURS}h before`}</span><span>{th ? "คืน 50%" : "50% refund"}</span></div>
        </section>

        <fieldset className="flex flex-col gap-2">
          <legend className="section-title mb-2">{th ? "เหตุผลที่ยกเลิก" : "Reason"}</legend>
          {REASONS[th ? "th" : "en"].map((r, i) => (
            <label key={r} className={`flex items-center gap-3 rounded-2xl border p-3.5 cursor-pointer ${reason === i ? "border-gold-500 bg-gold-500/5" : "border-ink-600 bg-ink-800"}`}>
              <input type="radio" name="reason" checked={reason === i} onChange={() => setReason(i)} className="w-5 h-5 accent-[#e0a400]" />{r}
            </label>
          ))}
        </fieldset>

        <section className="rounded-2xl border border-ink-600 bg-ink-800 p-4 text-sm flex flex-col gap-1.5">
          <div className="flex justify-between"><span className="text-ink-300">{th ? "ยอดที่จ่าย" : "Paid"}</span><span>{baht(paid)}</span></div>
          <div className="flex justify-between"><span className="text-ink-300">{th ? "ค่ายกเลิก" : "Cancellation fee"}</span><span>{baht(fee)}</span></div>
          <div className="flex justify-between border-t border-ink-600 pt-2 mt-1"><b className="font-medium">{th ? "คืนเข้าบัญชี" : "Refund"}</b><b className="font-display font-semibold text-xl text-gold-300">{baht(refund)}</b></div>
          <p className="text-xs text-ink-300">{th ? "ได้รับภายใน 1–3 วันทำการ ทางพร้อมเพย์เดิม" : "Within 1–3 business days to your original method"}</p>
        </section>

        <button onClick={() => setDone(true)} disabled={reason === null} className="h-14 rounded-2xl border border-crimson-500 text-crimson-200 font-display font-semibold disabled:opacity-40">
          {reason === null ? (th ? "เลือกเหตุผลก่อน" : "Pick a reason") : th ? "ยืนยันยกเลิก" : "Confirm cancellation"}
        </button>
        {post && <Link href={`/book/${post.id}`} className="h-12 rounded-2xl bg-crimson-500 text-white font-semibold flex items-center justify-center">{th ? "เปลี่ยนเวลาแทน (ฟรี)" : "Reschedule instead (free)"}</Link>}
      </div>
    </>
  );
}
