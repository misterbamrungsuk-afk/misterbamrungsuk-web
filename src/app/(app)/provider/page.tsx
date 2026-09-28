"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Stars, baht } from "@/components/ui";

export default function ProviderDashboard() {
  const { t, lang } = useI18n();
  const stats = [
    { label: lang === "th" ? "งานเสร็จแล้ว" : "Completed", value: "23", icon: "✅" },
    { label: lang === "th" ? "รายได้เดือนนี้" : "Earned this month", value: baht(18600), icon: "💰" },
    { label: lang === "th" ? "เรตติ้ง" : "Rating", value: "4.9", icon: "⭐" },
    { label: lang === "th" ? "ออเดอร์เสร็จแบบไม่มีปัญหา" : "Clean record", value: "100%", icon: "🛡️" },
  ];

  return (
    <>
      <TopBar back="/profile" title={`🌟 ${lang === "th" ? "โหมดเพื่อนรับจ้าง" : "Provider mode"}`} />

      <div className="px-4 py-4 space-y-4">
        {/* stats */}
        <div className="grid grid-cols-2 gap-3 animate-rise">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4">
              <p className="text-xl">{s.icon}</p>
              <p className="text-xl font-bold text-gold-400 mt-1">{s.value}</p>
              <p className="text-[10px] text-ink-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* incoming jobs */}
        <Link href="/provider/incoming" className="glass glass-hover rounded-2xl p-4 flex items-center gap-3 border-crimson-500/30 animate-rise">
          <span className="w-12 h-12 rounded-xl grid place-items-center text-2xl" style={{ background: "rgba(229,72,77,.15)" }}>📡</span>
          <div className="flex-1">
            <p className="font-semibold">{lang === "th" ? "งานเข้า (บรอดแคสต์)" : "Incoming jobs (broadcast)"}</p>
            <p className="text-xs text-ink-400">{lang === "th" ? "มี 2 งานรอการตอบรับ · ตอบภายใน 15 วินาที" : "2 waiting · accept within 15s"}</p>
          </div>
          <span className="w-5 h-5 rounded-full bg-crimson-600 text-[10px] font-bold grid place-items-center">2</span>
        </Link>

        {/* today schedule */}
        <div className="animate-rise">
          <h2 className="section-title mb-2">📅 {lang === "th" ? "งานวันนี้" : "Today"}</h2>
          <Link href="/provider/job/ij1" className="glass glass-hover rounded-2xl p-4 flex items-center gap-3">
            <div className="text-center">
              <p className="text-xs text-ink-400">17:00</p>
              <p className="chip chip-red mt-1">3{t.hoursUnit}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">คุณแนท · {lang === "th" ? "กินข้าว+ดูหนัง" : "Dinner & movie"}</p>
              <p className="text-xs text-ink-400 truncate">📍 สยาม พารากอน</p>
              <Stars value={5} />
            </div>
            <span className="chip chip-gold">{lang === "th" ? "รอเริ่มงาน" : "Upcoming"}</span>
          </Link>
        </div>

        {/* links */}
        <div className="glass rounded-2xl divide-y divide-white/5 overflow-hidden animate-rise">
          {[
            { href: "/post/manage", icon: "📝", label: t.myPost },
            { href: "/jobs?role=hirer", icon: "💼", label: lang === "th" ? "ประกาศรับงานของฉัน" : "My listings" },
            { href: "/orders", icon: "🧾", label: lang === "th" ? "ประวัติรับงาน/รายได้" : "Earning history" },
            { href: "/chat", icon: "🏦", label: t.bankAccounts },
          ].map((m) => (
            <Link key={m.href} href={m.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition">
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
