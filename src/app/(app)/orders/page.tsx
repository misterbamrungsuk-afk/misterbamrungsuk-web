"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { baht, EmptyState } from "@/components/ui";
import { DEMO_MY_ORDERS } from "@/lib/demo-data";
import type { OrderStatus } from "@/lib/types";

const steps: [OrderStatus, string][] = [
  ["negotiated", "stNegotiated"],
  ["paid", "stPaid"],
  ["in_progress", "stInProgress"],
  ["completed", "stCompleted"],
  ["reviewed", "stReviewed"],
];

export default function OrdersPage() {
  const { t, lang } = useI18n();

  const label = (s: OrderStatus) => t[steps.find((x) => x[0] === s)![1] as keyof typeof t] as string;
  const idx = (s: OrderStatus) => steps.findIndex((x) => x[0] === s);

  return (
    <>
      <TopBar back="/profile" title={`🧾 ${lang === "th" ? "ประวัติการจ้างงาน" : "My orders"}`} />
      <div className="px-4 py-4 grid gap-3">
        {DEMO_MY_ORDERS.length === 0 && <EmptyState icon="🧾" title={t.empty} />}
        {DEMO_MY_ORDERS.map((o) => {
          const step = idx(o.status);
          return (
            <div key={o.id} className="glass rounded-2xl p-4 animate-rise">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.provider.avatar} alt="" className="w-11 h-11 rounded-full bg-ink-700 object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{o.provider.name}</p>
                  <p className="text-[11px] text-ink-500">
                    {new Date(o.createdAt).toLocaleDateString(lang === "th" ? "th-TH" : "en-GB")}
                    {o.promoCode && ` · 🎟️ ${o.promoCode}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gold-600">{baht(o.totalAmount - o.discount)}</p>
                  {o.discount > 0 && <p className="text-[10px] text-emerald-400">−{baht(o.discount)}</p>}
                </div>
              </div>

              {/* timeline */}
              <div className="flex items-center mt-3">
                {steps.map(([s], i) => (
                  <div key={s} className="flex items-center flex-1 last:flex-none">
                    <span className={`w-2 h-2 rounded-full ${i <= step ? "bg-gold-500" : "bg-ink-600"}`} />
                    {i < steps.length - 1 && <div className={`h-0.5 flex-1 mx-0.5 ${i < step ? "bg-gold-500/60" : "bg-ink-600"}`} />}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1.5">
                <span className={`text-[10px] font-medium ${step >= 4 ? "text-gold-600" : "text-crimson-300"}`}>{label(o.status)}</span>
                <div className="flex gap-2">
                  {o.id === "o1" && <Link href="/escrow/e1" className="inline-flex items-center min-h-9 px-2 -mx-1 text-xs text-gold-300 hover:underline">🏦 {lang === "th" ? "ระบบกลาง" : "Escrow"} ›</Link>}
                  {(o.status === "negotiated" || o.status === "paid") && <Link href={`/order/${o.id}/cancel`} className="inline-flex items-center min-h-9 px-2 -mx-1 text-xs text-crimson-200 underline">{lang === "th" ? "ยกเลิก" : "Cancel"} ›</Link>}
                  {o.status === "in_progress" && <Link href={`/order/${o.id}/session`} className="inline-flex items-center min-h-9 px-2 -mx-1 text-xs text-gold-300 underline">{lang === "th" ? "ระหว่างนัด" : "Meet-up"} ›</Link>}
                  {o.status === "completed" && <Link href={`/order/${o.id}/complete`} className="inline-flex items-center min-h-9 px-2 -mx-1 text-xs text-gold-300 underline">{lang === "th" ? "ปล่อยเงิน / รีวิว" : "Release / review"} ›</Link>}
                  {o.roomId && <Link href={`/chat/${o.roomId}`} className="inline-flex items-center min-h-9 px-2 -mx-1 text-xs text-ink-200 hover:text-gold-300 underline">{t.chat} ›</Link>}
                </div>
              </div>
            </div>
          );
        })}
        <p className="text-[10px] text-ink-500 text-center pb-2">
          {lang === "th" ? "ทุกออเดอร์ผ่านระบบ Escrow — เงินคุณปลอดภัยทุกขั้นตอน" : "All orders run on escrow — your money is safe"}
        </p>
      </div>
    </>
  );
}
