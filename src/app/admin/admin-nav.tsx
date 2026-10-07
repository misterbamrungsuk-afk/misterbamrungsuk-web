"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui";
import { KYC_QUEUE, PAYOUTS, REPORTS, TICKETS } from "@/lib/admin-data";
import { ROLE_LABEL, canAccess, type AdminRole } from "@/lib/admin-auth";
import { ModeSwitch } from "@/components/mode-switch";

export const ADMIN_TABS = [
  { href: "/admin", label: "รายได้ GP", exact: true },
  { href: "/admin/applicants", label: "ผู้สมัคร Part-Time (/join)" },
  { href: "/admin/partners", label: "พาร์ทเนอร์ / พื้นที่โปรโมท" },
  { href: "/admin/market", label: "Marketplace สินค้า" },
  { href: "/admin/kyc", label: "คิว KYC", badge: KYC_QUEUE.length },
  { href: "/admin/orders", label: "ตรวจงาน" },
  { href: "/admin/payouts", label: "โอนให้ผู้ให้บริการ", badge: PAYOUTS.filter((p) => !p.hold).length },
  { href: "/admin/reports", label: "รีพอร์ท", badge: REPORTS.length },
  { href: "/admin/cs", label: "CS tickets", badge: TICKETS.filter((t) => t.status === "new").length },
  { href: "/admin/members", label: "สมาชิก · 3-strike" },
  { href: "/admin/promos", label: "โปรโมชัน" },
  { href: "/admin/audit", label: "Audit log · SOS" },
  { href: "/admin/settings", label: "ตั้งค่าระบบ" },
] as const;

export function AdminNav({ email, role }: { email: string; role: AdminRole }) {
  const path = usePathname();
  const tabs = ADMIN_TABS.filter((t) => canAccess(role, t.href));
  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin-login";
  };
  const isOn = (t: (typeof ADMIN_TABS)[number]) => ("exact" in t && t.exact ? path === t.href : path.startsWith(t.href));

  return (
    <>
      {/* จอใหญ่: เมนูซ้าย */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col gap-1 border-r border-ink-600 px-3 py-6 sticky top-0 h-dvh">
        <div className="px-2 pb-1"><Logo size={30} /></div>
        <p className="px-2 pb-3 text-[11px] font-semibold tracking-[0.15em] text-gold-400">ADMIN CONSOLE</p>
        <div className="pb-4"><ModeSwitch /></div>
        {tabs.map((t) => (
          <Link key={t.href} href={t.href}
            className={`flex items-center gap-2 h-10 px-3 rounded-xl text-sm transition ${isOn(t) ? "bg-ink-700 text-ink-100 shadow-[inset_2px_0_0_var(--color-crimson-500)]" : "text-ink-300 hover:text-ink-100"}`}>
            <span className="flex-1">{t.label}</span>
            {"badge" in t && t.badge ? <span className="min-w-5 h-5 px-1.5 rounded-full bg-crimson-500 text-white text-[11px] grid place-items-center">{t.badge}</span> : null}
          </Link>
        ))}
        <div className="mt-auto border-t border-ink-600 pt-3 px-2 flex flex-col gap-1">
          <p className="text-sm truncate" title={email}>{email}</p>
          <p className="text-xs text-gold-400">{ROLE_LABEL[role]}</p>
          <button onClick={logout} className="mt-2 h-10 rounded-xl border border-ink-600 text-sm text-left px-3 hover:border-crimson-500">ออกจากระบบ</button>
          <Link href="/home" className="h-10 flex items-center px-3 rounded-xl text-sm text-gold-300 hover:bg-ink-800">← กลับหน้าแอป</Link>
        </div>
      </aside>

      {/* มือถือ/แท็บเล็ต: หัว + แท็บเลื่อนแนวนอน */}
      <header className="lg:hidden sticky top-0 z-30 bg-ink-900/95 backdrop-blur-xl border-b border-ink-600">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/profile" aria-label="back" className="w-10 h-10 -ml-1 rounded-full border border-ink-600 grid place-items-center text-xl leading-none">‹</Link>
          <Logo size={26} />
          <span className="text-[11px] font-semibold tracking-[0.15em] text-gold-400">ADMIN</span>
          <span className="ml-auto text-[11px] text-ink-300 truncate max-w-[90px]">{ROLE_LABEL[role]}</span>
          <button onClick={logout} className="text-xs text-crimson-200 min-h-9 px-2">ออก</button>
        </div>
        <div className="px-4 pb-2.5"><ModeSwitch /></div>
        <nav className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3">
          {tabs.map((t) => (
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

export function DeniedBanner() {
  const sp = useSearchParams();
  if (!sp.get("denied")) return null;
  return <p role="alert" className="mb-4 rounded-2xl border border-crimson-500 bg-crimson-500/10 px-4 py-3 text-sm">บทบาทของคุณไม่มีสิทธิ์เข้าหน้านั้น จึงพากลับมาหน้านี้</p>;
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
