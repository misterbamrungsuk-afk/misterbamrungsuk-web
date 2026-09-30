"use client";

import { Suspense, use, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { baht } from "@/components/ui";
import { DEMO_POSTS, DEMO_PROMOS } from "@/lib/demo-data";
import { ADDRESSES, HERBAL_PRICE, packagePrice, promoDiscount, thaiDate } from "@/lib/booking";

// ขั้นที่ 2/3: คัดกรองสุขภาพ + โค้ดส่วนลด + สรุปยอด ก่อนจ่ายเข้าระบบกลาง
const HEALTH = [
  { id: "heart", th: "ความดันสูง / โรคหัวใจ", en: "High blood pressure / heart condition" },
  { id: "surgery", th: "ผ่าตัดภายใน 6 เดือน", en: "Surgery within 6 months" },
  { id: "injury", th: "กระดูก / ข้อ บาดเจ็บ", en: "Bone / joint injury" },
  { id: "pregnant", th: "ตั้งครรภ์", en: "Pregnant" },
] as const;

function CheckoutInner({ id }: { id: string }) {
  const { lang } = useI18n();
  const th = lang === "th";
  const router = useRouter();
  const sp = useSearchParams();
  const post = DEMO_POSTS.find((p) => p.id === id);

  const pkg = Number(sp.get("pkg") ?? 90);
  const date = sp.get("date") ?? "";
  const time = sp.get("time") ?? "";
  const addr = ADDRESSES.find((a) => a.id === sp.get("addr")) ?? ADDRESSES[0];
  const note = sp.get("note") ?? "";

  const [health, setHealth] = useState<Record<string, boolean>>({});
  const [avoid, setAvoid] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [method, setMethod] = useState("promptpay");
  const [herbal, setHerbal] = useState(false);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [codeErr, setCodeErr] = useState("");

  if (!post || !date || !time) {
    return (
      <>
        <TopBar back="/home" title={th ? "ตรวจสอบการจอง" : "Review booking"} />
        <div className="text-center py-20 px-6">
          <p className="text-ink-300">{th ? "ข้อมูลการจองไม่ครบ" : "Booking details missing"}</p>
          <Link href={post ? `/book/${post.id}` : "/home"} className="btn-crimson inline-flex h-12 px-6 rounded-xl items-center mt-4">{th ? "เลือกวันเวลาใหม่" : "Choose a time"}</Link>
        </div>
      </>
    );
  }

  const base = packagePrice(post, pkg);
  const METHODS = [
    { id: "promptpay", th: "พร้อมเพย์ (QR)", en: "PromptPay (QR)", sub: th ? "สแกนจ่ายผ่านแอปธนาคาร" : "Scan with any bank app", mark: "PP", color: "#113566" },
    { id: "card", th: "บัตรเครดิต / เดบิต", en: "Credit / debit card", sub: "Visa •••• 4242", mark: "VISA", color: "#1a1f71" },
    { id: "truemoney", th: "TrueMoney Wallet", en: "TrueMoney Wallet", sub: th ? "ผูกเบอร์ 08x-xxx-5678" : "Linked 08x-xxx-5678", mark: "TM", color: "#f26522" },
  ];
  const subtotal = base + (herbal ? HERBAL_PRICE : 0);
  const promo = DEMO_PROMOS.find((p) => p.code === applied);
  const discount = promoDiscount(promo, subtotal);
  const total = subtotal - discount;
  const hasCondition = Object.values(health).some(Boolean);

  const applyCode = () => {
    const c = code.trim().toUpperCase();
    const p = DEMO_PROMOS.find((x) => x.code === c);
    if (!p) return setCodeErr(th ? "ไม่พบโค้ดนี้" : "Code not found");
    if (!p.active || p.usedCount >= p.quota) return setCodeErr(th ? "โค้ดหมดอายุหรือสิทธิ์เต็มแล้ว" : "Code expired or fully used");
    setCodeErr("");
    setApplied(p.code);
  };

  const pay = () => {
    const q = new URLSearchParams({ id: post.id, pkg: String(pkg), date, time, addr: addr.id, total: String(total), method });
    router.push(`/book/success?${q}`);
  };

  return (
    <>
      <TopBar back={`/book/${post.id}`} title={th ? "ตรวจสอบการจอง · 2/3" : "Review · 2/3"} />
      <div className="px-4 pt-4 pb-28 flex flex-col gap-4">
        <section className="glass rounded-2xl p-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.images[0] ?? post.member.avatar} alt="" className="w-16 h-20 rounded-xl object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold truncate">{post.member.name} · {pkg} {th ? "นาที" : "min"}</p>
            <p className="text-sm text-ink-300">{thaiDate(date)} · {time}</p>
            <p className="text-sm text-ink-300 truncate">{th ? addr.th : addr.en}{note ? ` · ${note}` : ""}</p>
          </div>
          <Link href={`/book/${post.id}`} className="text-sm text-gold-500 min-h-9 px-1 inline-flex items-center shrink-0">{th ? "แก้ไข" : "Edit"}</Link>
        </section>

        <section className="glass rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="section-title">{th ? "คัดกรองสุขภาพก่อนนวด" : "Health screening"}</h2>
          <p className="text-xs text-ink-300 -mt-1">{th ? "ข้อมูลนี้ส่งให้หมอเท่านั้น เพื่อความปลอดภัยของคุณ" : "Shared with your therapist only, for your safety"}</p>
          {HEALTH.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3">
              <span className="text-sm">{th ? h.th : h.en}</span>
              <div className="flex gap-1.5 shrink-0" role="group" aria-label={th ? h.th : h.en}>
                {[true, false].map((v) => (
                  <button key={String(v)} onClick={() => setHealth({ ...health, [h.id]: v })} aria-pressed={health[h.id] === v}
                    className={`h-9 px-3.5 rounded-xl border text-sm ${health[h.id] === v ? "bg-ink-100 border-ink-100 text-ink-950 font-semibold" : "border-ink-600"}`}>
                    {v ? (th ? "มี" : "Yes") : (th ? "ไม่มี" : "No")}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {hasCondition && <p className="text-xs text-crimson-200">{th ? "หมอจะปรับแรงและท่านวดให้เหมาะสม หากไม่แน่ใจควรปรึกษาแพทย์ก่อน" : "Your therapist will adapt. If unsure, consult a doctor first."}</p>}
          <input value={avoid} onChange={(e) => setAvoid(e.target.value)} className="input-dark h-11" placeholder={th ? "จุดที่ห้ามนวด เช่น เข่าซ้าย" : "Areas to avoid, e.g. left knee"} aria-label={th ? "จุดที่ห้ามนวด" : "Areas to avoid"} />
          <label className="flex items-center gap-2.5 text-sm text-ink-200">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="w-5 h-5 accent-[#e0243c]" />
            {th ? "ยืนยันว่าข้อมูลสุขภาพถูกต้อง" : "I confirm this health info is correct"}
          </label>
        </section>

        <section className="glass rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="section-title">{th ? "อุปกรณ์เสริม" : "Add-ons"}</h2>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2.5">
              <input type="checkbox" checked={herbal} onChange={(e) => setHerbal(e.target.checked)} className="w-5 h-5 accent-[#d4af37]" />
              {th ? "ประคบสมุนไพร" : "Herbal compress"}
            </span>
            <span className="text-gold-300">+{baht(HERBAL_PRICE)}</span>
          </label>
        </section>

        <section className="glass rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="section-title">{th ? "โค้ดส่วนลด" : "Promo code"}</h2>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => { setCode(e.target.value); setCodeErr(""); }} className="input-dark h-12 uppercase tracking-wider" placeholder={DEMO_PROMOS[0]?.code ?? "CODE"} aria-label={th ? "โค้ดส่วนลด" : "Promo code"} />
            <button onClick={applyCode} disabled={!code.trim()} className="h-12 px-4 rounded-xl bg-ink-100 text-ink-950 font-semibold shrink-0 disabled:opacity-40">{th ? "ใช้โค้ด" : "Apply"}</button>
          </div>
          {codeErr && <p className="text-xs text-crimson-200">{codeErr}</p>}
          {applied && !codeErr && <p className="text-xs text-gold-300">✓ {th ? "ใช้โค้ด" : "Applied"} {applied} · −{baht(discount)}</p>}
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="section-title">{th ? "วิธีชำระเงิน" : "Payment method"}</h2>
          {METHODS.map((m) => (
            <button key={m.id} onClick={() => setMethod(m.id)} aria-pressed={method === m.id}
              className={`glass rounded-2xl p-3.5 flex items-center gap-3 text-left transition ${method === m.id ? "!border-gold-500" : ""}`}>
              <span className="w-11 h-11 rounded-xl grid place-items-center text-[11px] font-bold text-white shrink-0" style={{ background: m.color }}>{m.mark}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">{th ? m.th : m.en}</span>
                <span className="block text-xs text-ink-300 truncate">{m.sub}</span>
              </span>
              <span className={`w-5 h-5 rounded-full border-2 grid place-items-center shrink-0 ${method === m.id ? "border-gold-500" : "border-ink-500"}`}>{method === m.id && <span className="w-2.5 h-2.5 rounded-full bg-gold-500" />}</span>
            </button>
          ))}
        </section>

        <section className="glass rounded-2xl p-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between"><span className="text-ink-300">{th ? "นวด" : "Massage"} {pkg} {th ? "นาที" : "min"}</span><span>{baht(base)}</span></div>
          {herbal && <div className="flex justify-between"><span className="text-ink-300">{th ? "ประคบสมุนไพร" : "Herbal compress"}</span><span>{baht(HERBAL_PRICE)}</span></div>}
          {discount > 0 && <div className="flex justify-between text-gold-300"><span>{applied}</span><span>−{baht(discount)}</span></div>}
          <div className="flex justify-between border-t border-ink-600 pt-2.5 mt-1"><b className="font-medium">{th ? "รวม" : "Total"}</b><b className="font-display font-semibold text-xl">{baht(total)}</b></div>
          <p className="text-xs text-ink-300 mt-1">🔒 {th ? "เงินถูกกันในระบบกลางจนงานเสร็จ ยกเลิกก่อน 3 ชม. คืนเต็มจำนวน" : "Held in escrow until done. Free cancellation up to 3h before."}</p>
        </section>
      </div>

      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 px-4" style={{ bottom: "calc(16px + env(safe-area-inset-bottom))" }}>
        <button onClick={pay} disabled={!confirmed} className="btn-crimson w-full h-14 rounded-2xl font-display font-semibold text-lg">
          {confirmed ? `${th ? "ยืนยันและชำระ" : "Confirm & pay"} ${baht(total)}` : th ? "ยืนยันข้อมูลสุขภาพก่อน" : "Confirm health info first"}
        </button>
      </div>
    </>
  );
}

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <CheckoutInner id={id} />
    </Suspense>
  );
}
