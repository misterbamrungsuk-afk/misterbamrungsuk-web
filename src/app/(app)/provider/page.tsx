"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { baht } from "@/components/ui";
import { Toggle } from "./_components/toggle";

// เดโมโปรไฟล์ผู้ให้บริการ (Part-Time) — ต่อข้อมูลจริงภายหลัง
const P = {
  name: "น้องมายด์",
  code: "MB-2611007",
  pkg: "B · เพื่อนกินเที่ยว — มีความสามารถในการนวด",
  photo: "https://images.unsplash.com/photo-1610088441520-4352457e7095?auto=format&fit=crop&w=400&q=70",
  month: 4,
  jobs: 9,
  rating: 4.9,
  strikes: 0,
  guarantee: 15000,
  target: 12,
  areas: ["สยาม", "สุขุมวิท", "ทองหล่อ", "อารีย์", "สาทร"],
  bank: { name: "กสิกรไทย", no: "xxx-x-x4978-x", holder: "มายด์ ส." },
  tel: "08x-xxx-1234",
  line: "@mind.mb",
  langs: "ไทย, English",
};
const TIMELINE = [
  { t: "สมัครและชำระค่าสมัคร", done: true },
  { t: "ผ่านตรวจประวัติอาชญากรรม", done: true },
  { t: "ผ่านการอบรม 2 วัน", done: true },
  { t: "ชำระค่าการันตีแบรนด์", done: true },
  { t: "เปิดรับงานแล้ว", done: true, now: true },
];
const RECENT = [
  { d: "4 ต.ค.", s: "กินข้าว + ดูหนัง", c: "คุณแนท", net: 3400 },
  { d: "2 ต.ค.", s: "คาเฟ่ + ถ่ายรูป", c: "Ms. Emily", net: 2550 },
  { d: "29 ก.ย.", s: "นั่งชิล + คาเฟ่", c: "คุณพลอย", net: 2975 },
];

export default function ProviderProfile() {
  const { t, lang } = useI18n();
  const th = lang === "th";
  const [online, setOnline] = useState(true);
  const left = Math.max(0, P.target - P.month);

  return (
    <>
      <TopBar back="/profile" title={th ? "โปรไฟล์ผู้ให้บริการ" : "Provider profile"} />

      <div className="px-4 py-4 space-y-4">
        {/* การ์ดรูป + สถานะออนไลน์ */}
        <section className="rounded-3xl border border-gold-500/30 bg-[linear-gradient(160deg,rgba(140,20,30,.35),rgba(22,14,14,.95)_60%)] p-4 animate-rise">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={P.photo} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-gold-500/60" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-semibold truncate">{P.name}</p>
              <p className="text-xs text-gold-300 font-display">{P.code}</p>
              <p className="text-xs text-ink-300 mt-0.5 truncate">Part-Time · {P.pkg}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-ink-600 bg-ink-900/60 px-4 py-2">
            <span className={`w-2.5 h-2.5 rounded-full ${online ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" : "bg-ink-500"}`} />
            <span className="flex-1 text-sm">{online ? (th ? "ออนไลน์ - พร้อมรับงาน" : "Online - accepting jobs") : (th ? "ออฟไลน์" : "Offline")}</span>
            <Toggle on={online} onChange={setOnline} label={th ? "สถานะออนไลน์" : "Online status"} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              [String(P.jobs), th ? "งานสำเร็จ" : "Completed"],
              [`★ ${P.rating}`, th ? "คะแนนรีวิว" : "Rating"],
              [`${P.strikes}/3`, th ? "ใบเตือน" : "Strikes"],
            ].map(([v, k]) => (
              <div key={k} className="rounded-2xl bg-ink-900/60 border border-ink-600 py-2.5 text-center">
                <p className="font-display text-lg font-bold text-gold-300">{v}</p>
                <p className="text-[11px] text-ink-300">{k}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ความคืบหน้ารับคืนค่าการันตี (ครบ 1 ปี) */}
        <section className="rounded-3xl border border-ink-600 bg-ink-800 p-4 animate-rise">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gold-400">GUARANTEE REFUND</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="font-semibold">{th ? "รับคืนค่าการันตี" : "Guarantee refund"} {baht(P.guarantee)}</p>
            <p className="font-display text-gold-300">{th ? "เดือนที่" : "Month"} {P.month}/{P.target}</p>
          </div>
          <div className="flex gap-1 mt-3" aria-label={`${P.month} / ${P.target}`}>
            {Array.from({ length: P.target }, (_, i) => (
              <span key={i} className={`h-2.5 flex-1 rounded-full ${i < P.month ? "bg-gradient-to-r from-gold-400 to-gold-500" : "bg-ink-700"}`} />
            ))}
          </div>
          <p className="text-xs text-ink-300 mt-3">{left > 0 ? (th ? `อีก ${left} เดือน รับค่าการันตีคืนเต็มจำนวน · ไม่ผิดกฎ ไม่ปฏิเสธลูกค้า ✓` : `${left} more months to a full refund · no rule breaks, no declined customers ✓`) : (th ? "ครบ 1 ปีแล้ว! ทีมงานจะโอนค่าการันตีคืน" : "1 year done! Your guarantee will be refunded")}</p>
        </section>

        {/* สถานะบัญชี */}
        <section className="rounded-3xl border border-ink-600 bg-ink-800 p-4 animate-rise">
          <p className="font-semibold">{th ? "สถานะบัญชี" : "Account status"}</p>
          <ol className="mt-3">
            {TIMELINE.map((s, i) => (
              <li key={s.t} className="flex gap-3 relative pb-4 last:pb-0">
                {i < TIMELINE.length - 1 && <span className="absolute left-[11px] top-6 bottom-0 w-px bg-gold-500/30" aria-hidden />}
                <span className={`w-6 h-6 rounded-full grid place-items-center text-xs shrink-0 ${s.now ? "bg-crimson-500 text-white" : s.done ? "bg-gold-500 text-[#1a1206]" : "bg-ink-700 text-ink-400"}`}>{s.done ? "✓" : i + 1}</span>
                <span className={`text-sm pt-0.5 ${s.now ? "text-gold-200 font-semibold" : ""}`}>{s.t}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* ข้อมูลส่วนตัว / พื้นที่ / บัญชี */}
        <section className="rounded-3xl border border-ink-600 bg-ink-800 p-4 animate-rise space-y-4">
          <div>
            <p className="font-semibold">{th ? "ข้อมูลส่วนตัว" : "Personal info"}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm mt-2">
              <dt className="text-ink-300">{th ? "โทร" : "Phone"}</dt><dd>{P.tel}</dd>
              <dt className="text-ink-300">LINE</dt><dd>{P.line}</dd>
              <dt className="text-ink-300">{th ? "ภาษา" : "Languages"}</dt><dd>{P.langs}</dd>
            </dl>
          </div>
          <div>
            <p className="font-semibold">{th ? "พื้นที่ให้บริการ" : "Service areas"}</p>
            <div className="flex flex-wrap gap-2 mt-2">{P.areas.map((a) => <span key={a} className="chip chip-gold">{a}</span>)}</div>
          </div>
          <div>
            <p className="font-semibold">{th ? "บัญชีรับเงิน" : "Bank account"}</p>
            <p className="text-sm mt-1">{P.bank.name} · {P.bank.no}</p>
            <p className="text-xs text-ink-300">{P.bank.holder}</p>
          </div>
        </section>

        {/* งานล่าสุด */}
        <section className="rounded-3xl border border-ink-600 bg-ink-800 p-4 animate-rise">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{th ? "งานล่าสุด" : "Recent jobs"}</p>
            <Link href="/provider/incoming" className="text-xs text-gold-300">{th ? "ตารางงาน ›" : "Schedule ›"}</Link>
          </div>
          <ul className="mt-2 divide-y divide-ink-700">
            {RECENT.map((r) => (
              <li key={r.d + r.s} className="flex items-center gap-3 py-2.5">
                <span className="text-xs text-ink-400 w-14 shrink-0">{r.d}</span>
                <span className="flex-1 min-w-0"><span className="block text-sm truncate">{r.s}</span><span className="block text-xs text-ink-400">{r.c}</span></span>
                <span className="font-display text-gold-300">{baht(r.net)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* เมนู */}
        <div className="rounded-3xl border border-ink-600 bg-ink-800 divide-y divide-ink-700 overflow-hidden animate-rise">
          {[
            { href: "/provider/incoming", icon: "📅", label: th ? "ตารางงาน / งานเข้า" : "Schedule / incoming" },
            { href: "/post/manage", icon: "📝", label: t.myPost },
            { href: "/profile/verify", icon: "🛡️", label: t.verifyIdentity },
            { href: "/jobs?role=hirer", icon: "💼", label: th ? "ประกาศรับงานของฉัน" : "My listings" },
            { href: "/provider/earnings", icon: "💰", label: th ? "รายได้" : "Earnings" },
            { href: "/provider/availability", icon: "🗓️", label: th ? "เวลาว่าง / พื้นที่" : "Availability" },
            { href: "/provider/reviews", icon: "⭐", label: th ? "รีวิวของฉัน" : "My reviews" },
            { href: "/provider/strikes", icon: "⚠️", label: th ? "ใบเตือน / อุทธรณ์" : "Strikes & appeals" },
            { href: "/provider/settings", icon: "⚙️", label: th ? "ตั้งค่าผู้ให้บริการ" : "Provider settings" },
            { href: "/provider/apply", icon: "📝", label: th ? "สมัคร Part-Time / KYC" : "Apply / KYC" },
            { href: "/orders", icon: "🧾", label: th ? "ประวัติรับงาน" : "Job history" },
          ].map((m) => (
            <Link key={m.href} href={m.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-ink-700/40 transition">
              <span className="text-lg w-8 text-center">{m.icon}</span>
              <span className="flex-1 text-sm">{m.label}</span>
              <span className="text-ink-500">›</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
