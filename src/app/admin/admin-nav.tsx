"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui";
import { KYC_QUEUE, PAYOUTS, REPORTS, TICKETS } from "@/lib/admin-data";

export const ADMIN_TABS = [
  { href: "/admin", label: "รายได้ GP", exact: true },
  { href: "/admin/kyc", label: "คิว KYC", badge: KYC_QUEUE.length },
  { href: "/admin/orders", label: "ตรวจงาน" },
  { href: "/admin/payouts", label: "โอนให้หมอ", badge: PAYOUTS.filter((p) => !p.hold).length },
  { href: "/admin/reports", label: "รีพอร์ท", badge: REPORTS.length },
  { href: "/admin/cs", label: "CS tickets", badge: TICKETS.filter((t) => t.status === "new").length },
  { href: "/admin/members", label: "สมาชิก · 3-strike" },
  { href: "/admin/promos", label: "โปรโมชัน" },
  { href: "/admin/audit", label: "Audit log · SOS" },
  { href: "/admin/settings", label: "ตั้งค่าระบบ" },
] as const;

export function AdminNav() {
  const path = usePathname();
  const isOn = (t: (typeof ADMIN_TABS)[number]) => ("exact" in t && t.exact ? path === t.href : path.startsWith(t.href));

  return (
    <>
      {/* จอใหญ่: เมนูซ้าย */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col gap-1 border-r border-ink-600 px-3 py-6 sticky top-0 h-dvh">
        <div className="px-2 pb-1"><Logo size={30} /></div>
        <p className="px-2 pb-4 text-[11px] font-semibold tracking-[0.15em] text-gold-500">ADMIN CONSOLE</p>
        {ADMIN_TABS.map((t) => (
          <Link key={t.href} href={t.href}
            className={`flex items-center gap-2 h-10 px-3 rounded-xl text-sm transition ${isOn(t) ? "bg-ink-700 text-ink-100 shadow-[inset_2px_0_0_var(--color-crimson-500)]" : "text-ink-300 hover:text-ink-100"}`}>
            <span className="flex-1">{t.label}</span>
            {"badge" in t && t.badge ? <span className="min-w-5 h-5 px-1.5 rounded-full bg-crimson-500 text-white text-[11px] grid place-items-center">{t.badge}</span> : null}
          </Link>
        ))}
        <Link href="/home" className="mt-auto flex items-center h-10 px-3 rounded-xl text-sm text-gold-300 hover:bg-ink-800">← กลับหน้าแอป</Link>
      </aside>

      {/* มือถือ/แท็บเล็ต: หัว + แท็บเลื่อนแนวนอน */}
      <header className="lg:hidden sticky top-0 z-30 bg-ink-900/95 backdrop-blur-xl border-b border-ink-600">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/profile" aria-label="back" className="w-10 h-10 -ml-1 rounded-full border border-ink-600 grid place-items-center text-xl leading-none">‹</Link>
          <Logo size={26} />
          <span className="text-[11px] font-semibold tracking-[0.15em] text-gold-500">ADMIN</span>
          <Link href="/home" className="ml-auto text-xs text-gold-300 min-h-9 px-2 inline-flex items-center">กลับหน้าแอป</Link>
        </div>
        <nav className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3">
          {ADMIN_TABS.map((t) => (
            <Link key={t.href} href={t.href} className={`chip whitespace-nowrap h-9 px-3.5 inline-flex items-center gap-1.5 ${isOn(t) ? "chip-red" : ""}`}>
              {t.label}
              {"badge" in t && t.badge ? <span className="min-w-4 h-4 px-1 rounded-full bg-crimson-500 text-white text-[10px] grid place-items-center">{t.badge}</span> : null}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}

export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="text-2xl lg:text-[28px] font-semibold">{title}</h1>
        {sub && <p className="text-sm text-ink-300 mt-0.5">{sub}</p>}
      </div>
      {right && <div className="ml-auto flex flex-wrap gap-2">{right}</div>}
    </div>
  );
}

export function Pill({ tone = "muted", children }: { tone?: "gold" | "red" | "muted" | "green"; children: React.ReactNode }) {
  const cls = {
    gold: "border-gold-500 text-gold-300",
    red: "border-crimson-500 text-crimson-200",
    green: "border-emerald-500/70 text-emerald-300",
    muted: "border-ink-600 text-ink-300",
  }[tone];
  return <span className={`inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${cls}`}>{children}</span>;
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-2xl border border-ink-600 bg-ink-800 p-4 lg:p-5 ${className}`}>{children}</section>;
}
