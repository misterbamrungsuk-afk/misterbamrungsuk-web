"use client";

import { Suspense, use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { BookSteps } from "@/components/book-steps";
import { baht, Modal } from "@/components/ui";
import { DEMO_POSTS, DEMO_PROMOS } from "@/lib/demo-data";
import { PARTNER_SPAS, blockPrice, massageAddonPrice, nextDays, promoDiscount, thaiDate, timeSlots } from "@/lib/booking";
import { BANK } from "@/lib/join/config";
import { promptPayPayload } from "@/lib/join/promptpay";
import QRCode from "qrcode";

// ขั้นที่ 4/4: เวลา + สรุปยอด + วิธีชำระ + ยินยอมความปลอดภัย (บังคับ) + ยืนยันด้านสุขภาพ (popup เดิม)
const HEALTH = [
  { id: "heart", th: "ความดันสูง / โรคหัวใจ", en: "High blood pressure / heart condition" },
  { id: "surgery", th: "ผ่าตัดภายใน 6 เดือน", en: "Surgery within 6 months" },
  { id: "injury", th: "กระดูก / ข้อ บาดเจ็บ", en: "Bone / joint injury" },
  { id: "pregnant", th: "ตั้งครรภ์", en: "Pregnant" },
] as const;

const SAFETY_TH = "รับทราบว่าการอยู่ในสถานที่ส่วนตัวสองต่อสองกับบุคคลที่เพิ่งรู้จัก ท่านต้องดูแลและป้องกันตัวเอง บริษัทเป็นเพียงสื่อกลางในการให้บริการ และไม่มีบริการทางเพศ";
const SAFETY_EN = "I understand that being alone in a private place with someone I have just met means I must look after and protect myself. The company is only an intermediary, and no sexual services are offered.";

type Method = "promptpay" | "card" | "package";

function pad(n: number) { return String(n).padStart(2, "0"); }

function CheckoutInner({ id }: { id: string }) {
  const { lang } = useI18n();
  const th = lang === "th";
  const router = useRouter();
  const sp = useSearchParams();
  const post = DEMO_POSTS.find((p) => p.id === id);

  const hrs = Number(sp.get("hrs") ?? 3) === 5 ? 5 : 3;
  const massage = sp.get("massage") === "1";
  const loc = sp.get("loc") === "spa" ? "spa" : "home";
  const spaObj = PARTNER_SPAS.find((s) => s.id === sp.get("spa"));
  const place = sp.get("place") ?? "";
  const note = sp.get("note") ?? "";
  const days = useMemo(() => nextDays(5), []);

  const [when, setWhen] = useState<"now" | "later">("now");
  const [date, setDate] = useState(days[0].iso);
  const [time, setTime] = useState("");
  const [health, setHealth] = useState<Record<string, boolean>>({});
  const [avoid, setAvoid] = useState("");
  const [consentOpen, setConsentOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [safety, setSafety] = useState(false);
  const [paid, setPaid] = useState(false);
  const [method, setMethod] = useState<Method>("promptpay");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [codeErr, setCodeErr] = useState("");

  if (!post || !place) {
    return (
      <>
        <TopBar back="/home" title={th ? "ยืนยันและชำระ" : "Confirm & pay"} />
        <div className="text-center py-20 px-6">
          <p className="text-ink-300">{th ? "ข้อมูลการจองไม่ครบ" : "Booking details missing"}</p>
          <Link href={post ? `/book/${post.id}` : "/home"} className="btn-crimson inline-flex h-12 px-6 rounded-xl items-center mt-4">{th ? "เลือกบริการใหม่" : "Choose a service"}</Link>
        </div>
      </>
    );
  }

  const base = blockPrice(post, hrs);
  const addon = massage ? massageAddonPrice(post) : 0;
  const spaFee = loc === "spa" ? spaObj?.price ?? 0 : 0;
  const subtotal = base + addon + spaFee;
  const promo = DEMO_PROMOS.find((p) => p.code === applied);
  const discount = promoDiscount(promo, subtotal);
  const total = subtotal - discount;
  const hasCondition = Object.values(health).some(Boolean);
  const slots = timeSlots(post, date);
  const timeOk = when === "now" || !!time;
  const canConfirm = method === "promptpay" && paid && safety && timeOk;

  const applyCode = () => {
    const c = code.trim().toUpperCase();
    const p = DEMO_PROMOS.find((x) => x.code === c);
    if (!p) return setCodeErr(th ? "ไม่พบโค้ดนี้" : "Code not found");
    if (!p.active || p.usedCount >= p.quota) return setCodeErr(th ? "โค้ดหมดอายุหรือสิทธิ์เต็มแล้ว" : "Code expired or fully used");
    setCodeErr("");
    setApplied(p.code);
  };

  const pay = () => {
    let d = date, tm = time;
    if (when === "now") {
      const n = new Date();
      d = `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
      tm = `${pad(n.getHours())}:${pad(n.getMinutes())}`;
    }
    const q = new URLSearchParams({ id: post.id, pkg: String(hrs * 60), date: d, time: tm, place, total: String(total), method: "promptpay" });
    router.push(`/book/success?${q}`);
  };

  const box = "rounded-2xl border border-gold-500/20 bg-ink-800 p-4 flex flex-col gap-3";

  return (
    <>
      <TopBar back={`/book/${post.id}`} title={th ? "ยืนยันและชำระ" : "Confirm & pay"} />
      <BookSteps step={4} th={th} />
      <div className="px-4 pt-4 pb-28 flex flex-col gap-4">
        <section className={`${box} !flex-row items-center`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.images[0] ?? post.member.avatar} alt="" className="w-16 h-20 rounded-xl object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold truncate">{post.member.name} · Part-Time {hrs} {th ? "ชม." : "h"}</p>
            <p className="text-sm text-ink-300 truncate">{place}</p>
            {note && <p className="text-xs text-ink-400 truncate">{note}</p>}
          </div>
          <Link href={`/book/${post.id}`} className="text-sm text-gold-500 min-h-9 px-1 inline-flex items-center shrink-0">{th ? "แก้ไข" : "Edit"}</Link>
        </section>

        {/* เวลา */}
        <section className={box}>
          <h2 className="section-title">{th ? "เวลา" : "Time"}</h2>
          <div className="grid grid-cols-2 gap-2">
            {([["now", th ? "ตอนนี้" : "Now"], ["later", th ? "นัดล่วงหน้า" : "Schedule"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setWhen(k)} aria-pressed={when === k}
                className={`h-11 rounded-xl border text-sm font-semibold transition ${when === k ? "border-gold-500 bg-gold-500/10 text-gold-300" : "border-ink-600 text-ink-200"}`}>{l}</button>
            ))}
          </div>
          {when === "later" && (
            <>
              <div className="grid grid-cols-5 gap-2">
                {days.map((d) => (
                  <button key={d.iso} onClick={() => { setDate(d.iso); setTime(""); }} aria-pressed={date === d.iso}
                    className={`h-[60px] rounded-xl border flex flex-col items-center justify-center transition ${date === d.iso ? "bg-crimson-500 border-crimson-500 text-white" : "bg-ink-900 border-ink-600 text-ink-300"}`}>
                    <span className="text-xs">{d.dow}</span>
                    <span className="font-display font-semibold text-lg">{d.day}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {slots.map((s) => (
                  <button key={s.time} disabled={s.taken} onClick={() => setTime(s.time)} aria-pressed={time === s.time}
                    className={`h-10 rounded-xl border text-sm transition ${s.taken ? "border-ink-700 text-ink-500 line-through" : time === s.time ? "border-gold-500 bg-gold-500/10 text-gold-300" : "border-ink-600"}`}>
                    {s.time}
                  </button>
                ))}
              </div>
              {time && <p className="text-xs text-ink-300">{thaiDate(date)} · {time}</p>}
            </>
          )}
        </section>

        {massage && (
          <section className={box}>
            <h2 className="section-title">{th ? "ข้อมูลสุขภาพ (สำหรับ add-on นวด)" : "Health info (massage add-on)"}</h2>
            <p className="text-xs text-ink-300 -mt-1">{th ? "ข้อมูลนี้ส่งให้ Part-Time เท่านั้น เพื่อความปลอดภัยของคุณ" : "Shared with your Part-Time only, for your safety"}</p>
            {HEALTH.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3">
                <span className="text-sm">{th ? h.th : h.en}</span>
                <div className="flex gap-1.5 shrink-0" role="group" aria-label={th ? h.th : h.en}>
                  {[true, false].map((v) => (
                    <button key={String(v)} onClick={() => setHealth({ ...health, [h.id]: v })} aria-pressed={health[h.id] === v}
                      className={`h-9 px-3.5 rounded-xl border text-sm ${health[h.id] === v ? "bg-crimson-500 border-crimson-500 text-white font-semibold" : "border-ink-600"}`}>
                      {v ? (th ? "มี" : "Yes") : (th ? "ไม่มี" : "No")}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {hasCondition && <p className="text-xs text-crimson-200">{th ? "หากไม่แน่ใจควรปรึกษาแพทย์ก่อน" : "If unsure, consult a doctor first."}</p>}
            <input value={avoid} onChange={(e) => setAvoid(e.target.value)} className="input-dark h-11" placeholder={th ? "จุดที่ห้ามนวด เช่น เข่าซ้าย" : "Areas to avoid, e.g. left knee"} aria-label={th ? "จุดที่ห้ามนวด" : "Areas to avoid"} />
          </section>
        )}

        <section className={box}>
          <h2 className="section-title">{th ? "โค้ดส่วนลด" : "Promo code"}</h2>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => { setCode(e.target.value); setCodeErr(""); }} className="input-dark h-12 uppercase tracking-wider" placeholder={DEMO_PROMOS[0]?.code ?? "CODE"} aria-label={th ? "โค้ดส่วนลด" : "Promo code"} />
            <button onClick={applyCode} disabled={!code.trim()} className="h-12 px-4 rounded-xl bg-crimson-500 text-white font-semibold shrink-0 disabled:opacity-40">{th ? "ใช้โค้ด" : "Apply"}</button>
          </div>
          {codeErr && <p className="text-xs text-crimson-200">{codeErr}</p>}
          {applied && !codeErr && <p className="text-xs text-gold-300">✓ {th ? "ใช้โค้ด" : "Applied"} {applied} · −{baht(discount)}</p>}
        </section>

        {/* สรุปยอด */}
        <section className={`${box} !gap-2 text-sm`}>
          <div className="flex justify-between"><span className="text-ink-300">Part-Time {hrs} {th ? "ชม." : "h"}</span><span>{baht(base)}</span></div>
          {addon > 0 && <div className="flex justify-between"><span className="text-ink-300">{th ? "Add-on สกิลนวด" : "Massage add-on"}</span><span>{baht(addon)}</span></div>}
          {spaFee > 0 && <div className="flex justify-between"><span className="text-ink-300">{th ? "ค่าห้อง" : "Room"} · {spaObj?.name}</span><span>{baht(spaFee)}</span></div>}
          {discount > 0 && <div className="flex justify-between text-gold-300"><span>{applied}</span><span>−{baht(discount)}</span></div>}
          <div className="flex justify-between border-t border-ink-600 pt-2.5 mt-1"><b className="font-medium">{th ? "รวม" : "Total"}</b><b className="font-display font-semibold text-xl text-gold-300">{baht(total)}</b></div>
          <p className="text-xs text-ink-300 mt-1">🔒 {th ? "เงินถูกกันในระบบกลางจนงานเสร็จ ยกเลิกก่อน 3 ชม. คืนเต็มจำนวน" : "Held in escrow until done. Free cancellation up to 3h before."}</p>
        </section>

        {/* วิธีชำระ */}
        <section className={box}>
          <h2 className="section-title">{th ? "วิธีชำระเงิน" : "Payment method"}</h2>
          {([
            ["promptpay", th ? "พร้อมเพย์ (QR)" : "PromptPay (QR)", th ? "สแกนจ่ายทันที" : "Scan to pay instantly"],
            ["card", th ? "บัตรเครดิต / เดบิต" : "Credit / debit card", th ? "เร็วๆ นี้" : "Coming soon"],
            ["package", th ? "ใช้สิทธิ์แพ็กเกจสมาชิก" : "Use membership package", th ? "สำหรับผู้มีแพ็กเกจ" : "For package holders"],
          ] as const).map(([k, l, sub]) => (
            <label key={k} className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${method === k ? "border-gold-500 bg-gold-500/5" : "border-ink-600"}`}>
              <input type="radio" name="method" checked={method === k} onChange={() => setMethod(k)} className="accent-[#d4af37] w-5 h-5" />
              <span className="flex-1"><span className="block text-sm font-medium">{l}</span><span className="block text-xs text-ink-300">{sub}</span></span>
            </label>
          ))}

          {method === "promptpay" && (
            <div className="flex flex-col items-center gap-3 pt-1">
              <div className="w-full max-w-[260px] rounded-2xl bg-white overflow-hidden text-[#1a1206]">
                <div className="bg-[#113566] text-white text-center py-2 text-[12px] font-semibold tracking-wide">THAI QR PAYMENT · พร้อมเพย์</div>
                <div className="p-3 flex flex-col items-center">
                  <PromptPayQR amount={total} />
                  <p className="text-[12px] mt-1.5 font-medium">{BANK.accountName}</p>
                  <p className="font-display text-xl font-bold">{baht(total)}</p>
                </div>
              </div>
              <p className="text-xs text-ink-300 text-center leading-relaxed">{th ? "สแกนด้วยแอปธนาคารใดก็ได้ ยอดขึ้นให้อัตโนมัติ ตรวจชื่อผู้รับก่อนยืนยัน" : "Scan with any banking app — amount is pre-filled. Check the recipient name before confirming."}</p>
              <label className="flex items-center gap-2.5 text-sm text-ink-200 self-start min-h-9">
                <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="w-5 h-5 accent-[#d4af37]" />
                {th ? "ฉันโอนเงินเรียบร้อยแล้ว" : "I have completed the transfer"}
              </label>
            </div>
          )}
          {method === "card" && <p className="text-xs text-ink-300">{th ? "ระบบบัตรกำลังเปิดใช้งาน โปรดใช้พร้อมเพย์ไปก่อน" : "Card payments are coming soon — please use PromptPay for now."}</p>}
          {method === "package" && <p className="text-xs text-ink-300">{th ? "ยังไม่มีแพ็กเกจที่ใช้ได้ · " : "No active package · "}<Link href="/membership" className="text-gold-500 underline underline-offset-4">{th ? "ดูแพ็กเกจสมาชิก" : "See membership"}</Link></p>}
        </section>

        {/* ยินยอมความปลอดภัย (บังคับ) */}
        <label className="flex items-start gap-3 rounded-2xl border border-crimson-500/50 bg-crimson-500/10 p-4 text-sm text-ink-100 cursor-pointer">
          <input type="checkbox" checked={safety} onChange={(e) => setSafety(e.target.checked)} className="w-5 h-5 mt-0.5 shrink-0 accent-[#d4af37]" required aria-required="true" />
          <span className="leading-relaxed">{th ? SAFETY_TH : SAFETY_EN} <span className="text-crimson-300">*</span></span>
        </label>
      </div>

      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 px-4" style={{ bottom: "calc(16px + env(safe-area-inset-bottom))" }}>
        <button onClick={() => { setConsent(false); setConsentOpen(true); }} disabled={!canConfirm} className="btn-crimson w-full h-14 rounded-2xl font-display font-semibold text-lg">
          {!timeOk ? (th ? "เลือกเวลานัดก่อน" : "Pick a time first")
            : method !== "promptpay" ? (th ? "โปรดเลือกพร้อมเพย์" : "Please use PromptPay")
            : !paid ? (th ? `สแกนจ่าย ${baht(total)} แล้วติ๊กยืนยัน` : `Pay ${baht(total)}, then tick confirm`)
            : !safety ? (th ? "ติ๊กรับทราบเงื่อนไขความปลอดภัย" : "Tick the safety notice")
            : (th ? "ยืนยันการจอง" : "Confirm booking")}
        </button>
      </div>

      {/* ยืนยันด้านสุขภาพ — ถามทุกครั้งก่อนยืนยันการจอง */}
      <Modal open={consentOpen} onClose={() => setConsentOpen(false)} title={th ? "ยืนยันด้านสุขภาพ" : "Health consent"}>
        <p className="text-sm text-ink-300 leading-relaxed">{th ? "เพื่อความปลอดภัยของคุณ กรุณายืนยันก่อนจองทุกครั้ง หากมีข้อสงสัยควรปรึกษาแพทย์ก่อนรับบริการ" : "For your safety, please confirm before every booking. If unsure, consult a doctor first."}</p>
        <label className="flex items-start gap-2.5 text-sm text-ink-100 mt-4 min-h-9">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="w-5 h-5 mt-0.5 shrink-0 accent-[#d4af37]" />
          {th ? "ข้าพเจ้ายืนยันว่าสุขภาพพร้อมสำหรับกิจกรรมที่จอง และข้อมูลที่ให้ไว้ถูกต้อง" : "I confirm I am fit for the booked activities and my info is correct."}
        </label>
        <div className="flex gap-2 mt-5">
          <button onClick={() => setConsentOpen(false)} className="btn-ghost rounded-xl flex-1 h-12 text-sm">{th ? "ยกเลิก" : "Cancel"}</button>
          <button onClick={pay} disabled={!consent} className="btn-crimson rounded-xl flex-1 h-12 text-sm font-semibold">{th ? "ยืนยันการจอง" : "Confirm booking"}</button>
        </div>
      </Modal>
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

/** QR พร้อมเพย์ฝังยอด — สร้างใหม่เมื่อยอดเปลี่ยน */
function PromptPayQR({ amount }: { amount: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    const payload = promptPayPayload(BANK.promptPayId, amount);
    if (payload) QRCode.toDataURL(payload, { margin: 1, width: 440 }).then(setSrc).catch(() => setSrc(""));
  }, [amount]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={`QR พร้อมเพย์ ${amount} บาท`} className="w-full aspect-square" /> : <div className="w-full aspect-square grid place-items-center text-sm text-ink-400">…</div>;
}
