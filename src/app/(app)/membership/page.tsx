"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { baht, Toast } from "@/components/ui";
import PromptPayCard from "@/components/promptpay-qr";
import {
  MEMBERSHIP, SESSION_PACKS, planPrice, planLabel, getMember, activatePlan, hasPaidEntry, createGift,
  type PlanKey, type MemberState, type GiftRecord,
} from "@/lib/membership";

const fmt = (iso: string, th: boolean) => new Date(iso).toLocaleDateString(th ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function MembershipPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const [member, setMember] = useState<MemberState | null>(null);
  const [entryPaid, setEntryPaid] = useState(false);
  const [plan, setPlan] = useState<PlanKey>("monthly");
  const [asGift, setAsGift] = useState(false);
  const [gName, setGName] = useState("");
  const [gPhone, setGPhone] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gMsg, setGMsg] = useState("");
  const [paid, setPaid] = useState(false);
  const [gift, setGift] = useState<GiftRecord | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => { setMember(getMember()); setEntryPaid(hasPaidEntry()); }, []);

  // ของขวัญ: รวมค่าแรกเข้าให้ผู้รับเสมอ; ซื้อเอง: คิดค่าแรกเข้าเฉพาะครั้งแรก
  const withEntry = asGift || !entryPaid;
  const total = planPrice(plan, withEntry);
  const giftValid = gName.trim().length > 0 && (/^0\d{8,9}$/.test(gPhone.replace(/\D/g, "")) || /^\S+@\S+\.\S+$/.test(gEmail.trim()));
  const canConfirm = paid && (!asGift || giftValid);

  const confirm = () => {
    if (asGift) {
      setGift(createGift({ plan, toName: gName.trim(), toPhone: gPhone.trim(), toEmail: gEmail.trim(), message: gMsg.trim() }));
    } else {
      const m = activatePlan(plan);
      setMember(m);
      setEntryPaid(true);
      setToast(th ? "เปิดใช้งานสมาชิกแล้ว" : "Membership activated");
      setTimeout(() => setToast(""), 2200);
    }
    setPaid(false);
  };

  const plans: { k: PlanKey; title: string; sub: string; price: number }[] = [
    { k: "monthly", title: planLabel("monthly", th), sub: th ? "ต่ออายุทุกเดือน · ปลดล็อก Part-Time พรีเมียม" : "Renews monthly · unlocks Premium", price: MEMBERSHIP.monthlyFee },
    ...SESSION_PACKS.map((p) => ({ k: p.key, title: planLabel(p.key, th), sub: th ? `ใช้ได้ ${p.validMonths} เดือน · เฉลี่ย ${baht(Math.round(p.price / p.sessions))}/ครั้ง` : `Valid ${p.validMonths} months · ${baht(Math.round(p.price / p.sessions))}/session`, price: p.price })),
  ];

  return (
    <>
      <TopBar back="/profile" title={th ? "สมาชิก & แพ็กเกจ" : "Membership"} />
      <div className="px-4 pt-4 pb-28 flex flex-col gap-4">
        {/* สถานะปัจจุบัน */}
        {member ? (
          <section className="glass rounded-2xl p-4 border-gold-500/50 animate-rise">
            <div className="flex items-center justify-between gap-2">
              <h2 className="section-title">{th ? "สมาชิกของคุณ" : "Your membership"}</h2>
              <span className="chip chip-gold">{th ? "ใช้งานอยู่" : "Active"}</span>
            </div>
            <p className="font-display font-semibold text-lg mt-2">{member.plan === "gift" ? (th ? "ของขวัญสมาชิก" : "Gifted membership") : planLabel(member.plan, th)}</p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-xl bg-ink-800 border border-ink-600 px-3.5 py-3">
                <p className="text-[11px] text-ink-300">{th ? "ครั้งคงเหลือ" : "Sessions left"}</p>
                <p className="font-display font-semibold text-xl">{member.sessionsLeft == null ? (th ? "ไม่จำกัด" : "Unlimited") : member.sessionsLeft}</p>
              </div>
              <div className="rounded-xl bg-ink-800 border border-ink-600 px-3.5 py-3">
                <p className="text-[11px] text-ink-300">{th ? "หมดอายุ" : "Expires"}</p>
                <p className="font-display font-semibold text-base">{fmt(member.expiresAt, th)}</p>
              </div>
            </div>
          </section>
        ) : (
          <section className="glass rounded-2xl p-4 animate-rise">
            <h2 className="section-title">{th ? "สมัครสมาชิก Mister Bamrungsuk" : "Become a member"}</h2>
            <p className="text-sm text-ink-300 mt-1">{th ? "ปลดล็อก Part-Time กลุ่มพรีเมียม และรับราคาพิเศษเมื่อซื้อเป็นแพ็กเกจ" : "Unlock Premium Part-Time and save with session packs."}</p>
          </section>
        )}

        {/* เลือกแพ็กเกจ */}
        <section className="flex flex-col gap-2.5">
          <h2 className="section-title">{th ? "เลือกแพ็กเกจ" : "Choose a plan"}</h2>
          {plans.map((p) => (
            <button key={p.k} onClick={() => { setPlan(p.k); setPaid(false); }} aria-pressed={plan === p.k}
              className={`glass rounded-2xl p-4 text-left flex items-center gap-3 transition ${plan === p.k ? "border-crimson-500 ring-1 ring-crimson-500" : ""}`}>
              <span className={`w-5 h-5 rounded-full border-2 shrink-0 ${plan === p.k ? "border-crimson-500 bg-crimson-500 shadow-[inset_0_0_0_3px_white]" : "border-ink-500"}`} />
              <span className="flex-1 min-w-0">
                <span className="block font-semibold">{p.title}</span>
                <span className="block text-xs text-ink-300">{p.sub}</span>
              </span>
              <span className="font-display font-semibold text-gold-500 shrink-0">{baht(p.price)}</span>
            </button>
          ))}
          <p className="text-xs text-ink-300">{th ? `ค่าแรกเข้า ${baht(MEMBERSHIP.entryFee)} (ครั้งเดียว)` : `One-time entry fee ${baht(MEMBERSHIP.entryFee)}`}{entryPaid && !asGift ? (th ? " · คุณชำระแล้ว" : " · already paid") : ""}</p>
        </section>

        {/* ของขวัญ */}
        <section className="glass rounded-2xl p-4 flex flex-col gap-3">
          <label className="flex items-center gap-2.5 text-sm font-semibold">
            <input type="checkbox" checked={asGift} onChange={(e) => { setAsGift(e.target.checked); setPaid(false); setGift(null); }} className="w-5 h-5 accent-[#e0243c]" />
            🎁 {th ? "ซื้อเป็นของขวัญ" : "Buy as a gift"}
          </label>
          {asGift && (
            <>
              <input value={gName} onChange={(e) => setGName(e.target.value)} className="input-dark h-11" placeholder={th ? "ชื่อเพื่อน" : "Friend's name"} aria-label={th ? "ชื่อเพื่อน" : "Friend's name"} />
              <input value={gPhone} onChange={(e) => setGPhone(e.target.value)} inputMode="tel" className="input-dark h-11" placeholder={th ? "เบอร์โทร" : "Phone"} aria-label={th ? "เบอร์โทร" : "Phone"} />
              <input value={gEmail} onChange={(e) => setGEmail(e.target.value)} type="email" className="input-dark h-11" placeholder={th ? "อีเมล" : "Email"} aria-label={th ? "อีเมล" : "Email"} />
              <textarea value={gMsg} onChange={(e) => setGMsg(e.target.value)} rows={3} maxLength={200} className="input-dark py-2.5" placeholder={th ? "ข้อความถึงเพื่อน (ไม่บังคับ)" : "Message (optional)"} aria-label={th ? "ข้อความ" : "Message"} />
              {!giftValid && <p className="text-xs text-ink-300 -mt-1">{th ? "กรอกชื่อ และเบอร์โทรหรืออีเมลอย่างน้อย 1 ช่อง" : "Enter a name and a phone or email"}</p>}
            </>
          )}
        </section>

        {gift ? (
          <section className="glass rounded-2xl p-5 text-center flex flex-col items-center gap-2 border-gold-500/50 animate-rise">
            <p className="text-3xl">🎁</p>
            <h2 className="font-display font-semibold text-lg">{th ? `ของขวัญสำหรับ ${gift.toName} พร้อมแล้ว` : `Gift for ${gift.toName} is ready`}</h2>
            <p className="font-display font-bold text-2xl tracking-widest text-gold-500 select-all">{gift.code}</p>
            <p className="text-xs text-ink-300">{th ? "ส่งโค้ดนี้ให้เพื่อน แล้วให้กรอกที่หน้า “รับของขวัญ”" : "Send this code to your friend to redeem."}</p>
            <button onClick={() => { try { navigator.clipboard?.writeText(gift.code); } catch { /* ignore */ } setToast(th ? "คัดลอกโค้ดแล้ว" : "Code copied"); setTimeout(() => setToast(""), 2000); }} className="btn-ghost rounded-xl h-11 px-5 text-sm mt-1">{th ? "คัดลอกโค้ด" : "Copy code"}</button>
          </section>
        ) : (
          <section className="glass rounded-2xl p-4 flex flex-col items-center gap-3">
            <h2 className="section-title self-start">{th ? "ชำระผ่านพร้อมเพย์" : "Pay with PromptPay"}</h2>
            <div className="w-full text-sm flex flex-col gap-1.5">
              <div className="flex justify-between"><span className="text-ink-300">{planLabel(plan, th)}</span><span>{baht(planPrice(plan, false))}</span></div>
              {withEntry && <div className="flex justify-between"><span className="text-ink-300">{th ? "ค่าแรกเข้า" : "Entry fee"}</span><span>{baht(MEMBERSHIP.entryFee)}</span></div>}
              <div className="flex justify-between border-t border-ink-600 pt-2 mt-1"><b className="font-medium">{th ? "รวม" : "Total"}</b><b className="font-display font-semibold text-lg">{baht(total)}</b></div>
            </div>
            <PromptPayCard amount={total} />
            <p className="text-xs text-ink-300 text-center leading-relaxed">{th ? "สแกนด้วยแอปธนาคารใดก็ได้ ยอดขึ้นให้อัตโนมัติ ตรวจชื่อผู้รับก่อนยืนยัน" : "Scan with any banking app — amount is pre-filled."}</p>
            <label className="flex items-center gap-2.5 text-sm text-ink-200 self-start min-h-9">
              <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="w-5 h-5 accent-[#e0243c]" />
              {th ? "โอนแล้ว" : "I have transferred"}
            </label>
          </section>
        )}

        <Link href="/membership/redeem" className="text-sm text-gold-500 text-center min-h-9 inline-flex items-center justify-center">🎁 {th ? "มีโค้ดของขวัญ? รับของขวัญที่นี่" : "Have a gift code? Redeem"}</Link>
      </div>

      {!gift && (
        <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 px-4" style={{ bottom: "calc(16px + env(safe-area-inset-bottom))" }}>
          <button onClick={confirm} disabled={!canConfirm} className="btn-crimson w-full h-14 rounded-2xl font-display font-semibold text-lg">
            {asGift && !giftValid ? (th ? "กรอกข้อมูลผู้รับก่อน" : "Enter recipient first") : !paid ? (th ? `สแกนจ่าย ${baht(total)} แล้วติ๊ก “โอนแล้ว”` : `Pay ${baht(total)}, then tick`) : asGift ? (th ? "ยืนยันและสร้างโค้ดของขวัญ" : "Confirm & create gift code") : (th ? "ยืนยันการชำระเงิน" : "Confirm payment")}
          </button>
        </div>
      )}
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
