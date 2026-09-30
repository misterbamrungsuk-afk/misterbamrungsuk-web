"use client";

import Link from "next/link";
import { useI18n, LangToggle } from "@/i18n/provider";
import { Logo, Stars } from "@/components/ui";
import { DEMO_POSTS } from "@/lib/demo-data";

export default function WelcomePage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const steps = [
    { n: "01", t: th ? "เลือกหมอนวด" : "Pick a therapist", d: th ? "ดูโปรไฟล์ รีวิว และใบรับรอง" : "Browse profiles, reviews and certificates" },
    { n: "02", t: th ? "จองและชำระผ่านระบบกลาง" : "Book & pay via escrow", d: th ? "เงินถูกกันไว้จนงานเสร็จ" : "Funds held until the job is done" },
    { n: "03", t: th ? "หมอมาถึงที่" : "Therapist arrives", d: th ? "ติดตามสด LIVE พร้อมปุ่ม SOS" : "Live tracking with SOS button" },
  ];
  const trust = [
    { i: "🛡️", t: th ? "ยืนยันตัวตน KYC" : "KYC verified", d: th ? "บัตรประชาชน + ใบรับรองนวด" : "ID + massage certificate" },
    { i: "💳", t: th ? "จ่ายผ่านระบบกลาง" : "Escrow payments", d: th ? "ไม่ต้องโอนตรงให้หมอ" : "Never pay the therapist directly" },
    { i: "🚨", t: th ? "SOS 24 ชม." : "24h SOS", d: th ? "แจ้งทีมงานพร้อมตำแหน่งทันที" : "Alert our team with your location" },
    { i: "⭐", t: th ? "รีวิวจริง" : "Real reviews", d: th ? "เฉพาะผู้ที่จองจริงเท่านั้น" : "Only from real bookings" },
  ];
  const featured = DEMO_POSTS.slice(0, 3);

  return (
    <main className="min-h-dvh bg-ink-950 text-ink-100 overflow-x-hidden">
      <header className="sticky top-0 z-20 bg-ink-950/80 backdrop-blur border-b border-white/5">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-3">
          <Logo size={28} />
          <nav className="hidden md:flex gap-6 text-sm text-ink-300">
            <a href="#how" className="hover:text-gold-300">{th ? "วิธีใช้งาน" : "How it works"}</a>
            <a href="#safety" className="hover:text-gold-300">{th ? "ความปลอดภัย" : "Safety"}</a>
            <Link href="/provider/apply" className="hover:text-gold-300">{th ? "สมัครเป็นหมอนวด" : "Become a therapist"}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <LangToggle />
            <Link href="/login" className="btn-crimson rounded-full px-4 h-10 inline-flex items-center text-sm font-semibold whitespace-nowrap">{th ? "เปิดแอป" : "Open app"}</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-10 pb-12 md:pt-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-gold-500">PREMIUM MALE MASSAGE · BANGKOK</p>
          <h1 className="font-display text-[32px] md:text-5xl leading-tight font-bold mt-3">{th ? "หมอนวดชายมืออาชีพ มาหาคุณถึงที่" : "Professional male therapists, at your door"}</h1>
          <p className="text-ink-300 mt-4 text-[15px] leading-relaxed">{th ? "หมอนวดทุกคนยืนยันตัวตนและใบรับรอง จองง่าย จ่ายผ่านระบบกลางที่ปลอดภัย" : "Every therapist is ID- and certificate-verified. Easy booking, secure escrow payments."}</p>
          <div className="flex flex-wrap gap-3 mt-7">
            <Link href="/login" className="btn-crimson rounded-full px-6 h-12 inline-flex items-center font-semibold">{th ? "เริ่มจองเลย" : "Book now"}</Link>
            <Link href="/onboarding" className="btn-ghost rounded-full px-6 h-12 inline-flex items-center font-semibold">{th ? "ดูวิธีใช้งาน" : "Take the tour"}</Link>
          </div>
        </div>
        <div className="relative rounded-3xl overflow-hidden h-72 md:h-[420px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://images.unsplash.com/photo-1615269143162-592b3882fcbe?auto=format&fit=crop&w=900&q=70" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
          <span className="chip chip-gold absolute left-4 bottom-4">✓ {th ? "ยืนยันแล้วทุกคน" : "All verified"}</span>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-xs font-semibold tracking-[0.18em] text-gold-500">HOW IT WORKS</p>
        <h2 className="font-display text-2xl md:text-3xl font-bold mt-2">{th ? "ใช้งานง่ายใน 3 ขั้นตอน" : "Three simple steps"}</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {steps.map((s) => (
            <div key={s.n} className="glass rounded-3xl p-6">
              <span className="font-display text-gold-500 text-2xl font-bold">{s.n}</span>
              <h3 className="font-semibold mt-2">{s.t}</h3>
              <p className="text-sm text-ink-400 mt-1">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-xs font-semibold tracking-[0.18em] text-gold-500">FEATURED</p>
        <h2 className="font-display text-2xl md:text-3xl font-bold mt-2">{th ? "หมอนวดแนะนำ" : "Featured therapists"}</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          {featured.map((p) => (
            <Link key={p.id} href="/login" className="relative block rounded-3xl overflow-hidden h-80 glass-hover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.images[0] || p.member.avatar} alt={p.member.name} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 p-4 pt-14 bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent">
                <p className="font-display font-semibold text-lg">{p.member.name}{p.member.kycVerified && <span className="text-gold-500 text-sm"> ✓</span>}</p>
                <p className="text-xs text-ink-300 truncate">{p.serviceArea}</p>
                <div className="flex items-center justify-between mt-1.5 gap-2">
                  <Stars value={p.rating} size={12} />
                  <span className="text-gold-300 text-sm font-semibold whitespace-nowrap">฿{p.pricePerHour}/{th ? "ชม." : "hr"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="safety" className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-xs font-semibold tracking-[0.18em] text-gold-500">TRUST &amp; SAFETY</p>
        <h2 className="font-display text-2xl md:text-3xl font-bold mt-2">{th ? "ปลอดภัยทุกขั้นตอน" : "Safe at every step"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {trust.map((x) => (
            <div key={x.t} className="glass rounded-3xl p-5">
              <span className="text-2xl">{x.i}</span>
              <h3 className="font-semibold mt-2">{x.t}</h3>
              <p className="text-sm text-ink-400 mt-1">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="glass rounded-3xl p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <h2 className="font-display text-2xl font-bold">{th ? "เป็นหมอนวดกับ MorD" : "Become a MorD therapist"}</h2>
            <p className="text-ink-400 text-sm mt-1">{th ? "รับงานใกล้คุณ รายได้โปร่งใส จ่ายตรงเวลา" : "Nearby jobs, transparent earnings, on-time payouts"}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/provider/apply" className="btn-ghost rounded-full px-6 h-12 inline-flex items-center font-semibold">{th ? "สมัครเป็นหมอนวด" : "Apply now"}</Link>
            <Link href="/login" className="btn-crimson rounded-full px-6 h-12 inline-flex items-center font-semibold">{th ? "เข้าสู่ระบบ" : "Log in"}</Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-ink-500 border-t border-white/5">
        © 2026 MorD · {th ? "สำหรับผู้มีอายุ 18 ปีขึ้นไป · นวดเพื่อสุขภาพเท่านั้น" : "18+ only · Wellness massage only"}
      </footer>
    </main>
  );
}
