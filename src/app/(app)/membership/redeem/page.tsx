"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { redeemGift, planLabel, type PlanKey } from "@/lib/membership";

export default function RedeemGiftPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState<PlanKey | null>(null);

  const submit = () => {
    const r = redeemGift(code);
    if (r.ok) { setDone(r.plan); setErr(""); } else setErr(r.reason);
  };

  return (
    <>
      <TopBar back="/membership" title={th ? "รับของขวัญ" : "Redeem gift"} />
      <div className="px-4 pt-6 pb-10 flex flex-col gap-4">
        {done ? (
          <section className="glass rounded-2xl p-6 text-center flex flex-col items-center gap-2 animate-rise">
            <p className="text-4xl">🎉</p>
            <h1 className="font-display font-semibold text-xl">{th ? "รับของขวัญเรียบร้อย" : "Gift redeemed"}</h1>
            <p className="text-sm text-ink-300">{planLabel(done, th)} · {th ? "ปลดล็อกเพื่อนพรีเมียมแล้ว" : "Premium companions unlocked"}</p>
            <div className="flex gap-2 mt-3 w-full">
              <Link href="/membership" className="btn-ghost rounded-xl flex-1 h-12 grid place-items-center text-sm">{th ? "ดูสมาชิก" : "Membership"}</Link>
              <Link href="/home#premium" className="btn-crimson rounded-xl flex-1 h-12 grid place-items-center text-sm font-semibold">{th ? "ดูเพื่อนพรีเมียม" : "See Premium"}</Link>
            </div>
          </section>
        ) : (
          <section className="glass rounded-2xl p-5 flex flex-col gap-3 animate-rise">
            <p className="text-3xl">🎁</p>
            <h1 className="font-display font-semibold text-lg">{th ? "กรอกโค้ดของขวัญ" : "Enter your gift code"}</h1>
            <p className="text-xs text-ink-300 -mt-1">{th ? "โค้ดที่เพื่อนส่งให้ เช่น GIFT-ABC123 (โหมดสาธิต)" : "The code your friend sent, e.g. GIFT-ABC123 (demo)"}</p>
            <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(""); }} className="input-dark h-12 uppercase tracking-widest" placeholder="GIFT-XXXXXX" aria-label={th ? "โค้ดของขวัญ" : "Gift code"} />
            {err && <p className="text-xs text-crimson-200">{err}</p>}
            <button onClick={submit} disabled={!code.trim()} className="btn-crimson h-12 rounded-xl font-display font-semibold">{th ? "รับของขวัญ" : "Redeem"}</button>
          </section>
        )}
      </div>
    </>
  );
}
