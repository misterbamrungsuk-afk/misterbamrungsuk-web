"use client";

import { useState } from "react";
import Link from "next/link";
import { PACKAGE_KEYS, PARTNER_PACKAGES, baht, type PartnerPackageKey } from "@/lib/partner/config";
import { PartnerPayBox } from "../pay-box";

export function SignupPay({ token, business, initial, hasPassword }: { token: string; business: string; initial: PartnerPackageKey; hasPassword: boolean }) {
  const [pkg, setPkg] = useState<PartnerPackageKey>(initial);
  const [invoice, setInvoice] = useState("");

  if (invoice)
    return (
      <section className="flex flex-col items-center text-center mt-8">
        <span className="w-20 h-20 rounded-full border-2 border-gold-500 grid place-items-center text-gold-400 text-4xl">✓</span>
        <h2 className="font-display text-2xl font-semibold mt-4">ส่งสลิปเรียบร้อย</h2>
        <p className="text-sm text-ink-300 mt-1">ใบแจ้งหนี้ {invoice} · รอทีมงานตรวจสลิปภายใน 24 ชม.</p>
        {hasPassword
          ? <Link href="/partner/portal" className="btn-crimson min-h-12 px-6 rounded-full inline-flex items-center font-semibold mt-6">ไปที่พอร์ทัลพาร์ทเนอร์</Link>
          : <Link href={`/partner/register?t=${encodeURIComponent(token)}`} className="btn-crimson min-h-12 px-6 rounded-full inline-flex items-center font-semibold mt-6">ขั้นตอน 3/3 · ตั้งรหัสผ่านเข้าพอร์ทัล</Link>}
      </section>
    );

  return (
    <>
      <p className="text-sm text-ink-300 mt-1">{business}</p>
      <div className="grid grid-cols-3 gap-2 mt-5" role="radiogroup" aria-label="แพ็กเกจ">
        {PACKAGE_KEYS.map((k) => {
          const x = PARTNER_PACKAGES[k];
          return (
            <button key={k} type="button" role="radio" aria-checked={pkg === k} onClick={() => setPkg(k)}
              className={`rounded-2xl border p-3 text-left ${pkg === k ? "border-gold-500 bg-gold-500/10" : "border-ink-600 bg-ink-800/60"}`}>
              <p className="font-display font-semibold">{x.label}</p>
              <p className="text-xs text-gold-300 mt-1">{x.price == null ? "ติดต่อทีมงาน" : `฿${baht(x.price)}`}</p>
            </button>
          );
        })}
      </div>
      <section className="glass rounded-3xl p-5 mt-4">
        <PartnerPayBox key={pkg} pkg={pkg} token={token} onDone={setInvoice} />
      </section>
    </>
  );
}
