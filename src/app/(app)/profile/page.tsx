"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n, LangToggle } from "@/i18n/provider";
import { VerifiedBadge } from "@/components/ui";
import { DEMO_ME } from "@/lib/demo-data";

const menuIcon = {
  post: "📝", jobs: "💼", banks: "🏦", orders: "🧾", match: "⚡", terms: "📜", admin: "🛡️",
};

export default function ProfilePage() {
  const { t, lang } = useI18n();
  const me = DEMO_ME;
  const [kyc, setKyc] = useState<"none" | "pending" | "verified">("none");

  const menu = [
    { href: "/profile/edit", icon: "✏️", label: t.profileInfo },
    { href: "/membership", icon: "♛", label: lang === "th" ? "สมาชิก & แพ็กเกจ" : "Membership & packs" },
    { href: "/membership/redeem", icon: "🎁", label: lang === "th" ? "รับของขวัญ" : "Redeem gift" },
    { href: "/orders", icon: "🧾", label: lang === "th" ? "ประวัติการจ้างงาน" : "My orders" },
    { href: "/search", icon: "🔍", label: lang === "th" ? "ค้นหาหมอนวด" : "Search therapists" },
    { href: "/profile/addresses", icon: "📍", label: lang === "th" ? "ที่อยู่ที่บันทึก" : "Saved addresses" },
    { href: "/profile/language", icon: "🌐", label: lang === "th" ? "ภาษา" : "Language" },
    { href: "/favorites", icon: "❤️", label: lang === "th" ? "หมอคนโปรด" : "Favorite therapists" },
    { href: "/notifications", icon: "🔔", label: lang === "th" ? "การแจ้งเตือน" : "Notifications" },
    { href: "/jobs", icon: "📋", label: lang === "th" ? "บอร์ดประกาศงาน" : "Job board" },
    { href: "/provider", icon: "🌟", label: lang === "th" ? "โหมดหมอนวด" : "Provider mode" },
    { href: "/post/manage", icon: menuIcon.post, label: t.myPost },
    { href: "/profile/verify", icon: "🛡️", label: t.verifyIdentity, badge: kyc === "verified" ? t.verified : kyc === "pending" ? t.kycPending : t.unverified },
    { href: "/jobs/interested", icon: "❤️", label: t.interestedCount },
    { href: "/map", icon: "🗺️", label: lang === "th" ? "แผนที่ใกล้ฉัน" : "Nearby map" },
    { href: "/chat", icon: menuIcon.banks, label: t.bankAccounts },
    { href: "/matching", icon: menuIcon.match, label: t.quickMatch },
    { href: "/admin", icon: menuIcon.admin, label: t.admin.kyc + " (Admin)" },
    { href: "/page/terms", icon: menuIcon.terms, label: t.aboutTerms },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-ink-950/85 backdrop-blur-xl border-b border-ink-600">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="font-semibold">{t.nav.profile}</h1>
          <LangToggle />
        </div>
      </header>

      <div className="px-4 py-6">
        {/* profile card */}
        <div className="glass rounded-3xl p-6 text-center relative overflow-hidden animate-rise">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-crimson-500/15 blur-3xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={me.avatar} alt="" className="w-20 h-20 rounded-full mx-auto bg-ink-700 border-2 border-gold-500/50" />
          <h2 className="text-lg font-bold mt-3">{me.name}</h2>
          <p className="text-xs text-ink-400 mt-0.5">{t.genderAge}: {me.gender === "male" ? (lang === "th" ? "ชาย" : "Male") : "—"} · {me.age ?? t.notSpecified} {t.yearsOld}</p>
          <p className="text-xs text-ink-400">📍 {me.province}</p>
          <div className="mt-3">
            {kyc === "verified"
              ? <VerifiedBadge label={t.verified} />
              : kyc === "pending"
                ? <span className="chip chip-gold">⏳ {t.kycPending}</span>
                : <Link href="/profile/verify" className="btn-crimson rounded-full px-5 py-2 text-xs font-semibold inline-flex">🛡️ {t.verifyIdentity}</Link>}
          </div>
        </div>

        {/* menu */}
        <div className="glass rounded-2xl mt-4 divide-y divide-white/5 overflow-hidden">
          {menu.map((m) => (
            <Link key={m.href} href={m.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition">
              <span className="text-lg w-8 text-center">{m.icon}</span>
              <span className="flex-1 text-sm">{m.label}</span>
              {m.badge && <span className={`chip ${m.badge === t.verified ? "chip-gold" : ""}`}>{m.badge}</span>}
              <span className="text-ink-500">›</span>
            </Link>
          ))}
        </div>

        {/* safety card */}
        <div className="glass rounded-2xl mt-4 p-4">
          <h3 className="section-title mb-2">🛡️ {t.safety}</h3>
          <ul className="text-xs text-ink-300 space-y-1.5">
            {t.safetyTips.map((s, i) => <li key={i}>• {s}</li>)}
          </ul>
        </div>

        <div className="flex gap-2 mt-4 mb-4">
          <button type="button" onClick={async () => { try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* ออฟไลน์ */ } document.cookie = "hamoo_session=; path=/; max-age=0"; window.location.href = "/login"; }} className="btn-ghost rounded-xl flex-1 py-3 text-sm text-center">{t.logout}</button>
          <Link href="/profile/edit" className="btn-ghost rounded-xl flex-1 py-3 text-sm text-crimson-300 text-center">{t.deleteAccount}</Link>
        </div>
        <p className="text-center text-[10px] text-ink-600">© 2026 Mister Bamrungsuk · {lang === "th" ? "ใช้งานฟรี (อาจมีค่าธรรมเนียมในอนาคต)" : "Free to use"}</p>
      </div>
      <span className="hidden">{String(kyc === "verified")}</span>
      <button className="hidden" onClick={() => setKyc("verified")} />
    </>
  );
}
