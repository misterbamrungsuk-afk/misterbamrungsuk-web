"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui";
import { Fragment } from "react";
import { ROLE_LABEL, canAccess, type AdminRole } from "@/lib/admin-auth";
import { ModeSwitch } from "@/components/mode-switch";

export type AdminTab = { href: string; label: string; exact?: boolean; divider?: boolean; badge?: number };
export const ADMIN_TABS: AdminTab[] = [
  { href: "/admin", label: "ภาพรวม", exact: true },
  { href: "/admin/audit", label: "SOS · แจ้งเตือนระบบ" },
  { href: "/admin/orders", label: "ตรวจงาน" },
  { href: "/admin/chats", label: "แชท · คำห้ามส่ง" },
  { href: "/admin/reports", label: "รายงานผู้ใช้" },
  { href: "/admin/applicants", label: "ผู้สมัคร" },
  { href: "/admin/slips", label: "ตรวจสลิป · Slip2Go" },
  { href: "/admin/wallet", label: "กระเป๋าเงิน · เติมเงิน" },
  { href: "/admin/kyc", label: "คิว KYC" },
  { href: "/admin/cohorts", label: "กลุ่มอบรม / เช็กชื่อ" },
  { href: "/admin/earnings", label: "ราคาและส่วนแบ่ง" },
  { href: "/admin/invites", label: "ลิงก์เชิญ" },
  { href: "/admin/payouts", label: "โอนให้ Part-Time" },
  { href: "/admin/partners", label: "พาร์ทเนอร์ / พื้นที่โปรโมท" },
  { href: "/admin/market", label: "ร้านค้า Marketplace" },
  { href: "/admin/promos", label: "โค้ดโปรโมชัน · ของขวัญ" },
  { href: "/admin/covers", label: "รูปหน้าปก", divider: true },
  
];

export function AdminNav({ email, role }: { email: string; role: AdminRole }) {
  const path = usePathname();
  const tabs = ADMIN_TABS.filter((t) => canAccess(role, t.href));
  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin-login";
  };
  const isOn = (t: AdminTab) => (t.exact ? path === t.href : path.startsWith(t.href));

  return (
    <>
      {/* จอใหญ่: เมนูซ้าย */}
      <nav aria-label="เมนูแอดมิน" className="hidden lg:flex w-[232px] shrink-0 flex-col gap-0.5 border-r border-[rgba(240,200,90,.38)] bg-[#0e0a0a] px-3.5 py-[18px] text-[13px] font-lux-body sticky top-0 h-dvh overflow-y-auto no-scrollbar">
        <div className="flex items-center gap-2.5 mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="Mister Bamrungsuk" className="w-[46px] h-[46px] object-contain" />
          <div className="leading-[1.1] min-w-0">
            <div className="font-lux font-semibold text-[#f0c75a]">Mister Bamrungsuk</div>
            <div className="text-[11px] text-[#7d6d6a] truncate">Admin · {role}</div>
          </div>
        </div>
        {tabs.map((t) => (
          <Fragment key={t.href}>
            {"divider" in t && t.divider && <div className="h-px shrink-0 bg-[rgba(240,200,90,.38)] my-1.5" />}
            <Link href={t.href} aria-current={isOn(t) ? "page" : undefined}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[10px] border transition ${isOn(t) ? "bg-[rgba(176,24,44,.2)] border-[rgba(201,40,61,.55)] text-[#f6efe4]" : "border-transparent text-[#cdbfb3] hover:text-[#f6efe4]"}`}>
              <span className="flex-1">{t.label}</span>
              {"badge" in t && t.badge ? <span className="min-w-5 h-5 px-1.5 rounded-full bg-crimson-500 text-white text-[11px] grid place-items-center">{t.badge}</span> : null}
            </Link>
          </Fragment>
        ))}
        <div className="mt-auto pt-3 flex flex-col gap-1">
          <div className="pb-2"><ModeSwitch /></div>
          <p className="px-3 text-xs text-[#cdbfb3] truncate" title={email}>{email} · <span className="text-[#f0c75a]">{ROLE_LABEL[role]}</span></p>
          <button onClick={logout} className="mt-1 px-3 py-1.5 rounded-[10px] border border-[rgba(240,200,90,.38)] text-left text-[#cdbfb3] hover:border-[rgba(201,40,61,.55)]">ออกจากระบบ</button>
          <Link href="/home" className="px-3 py-1.5 text-[#ffd76a]">← กลับหน้าแอป</Link>
        </div>
      </nav>

      {/* มือถือ/แท็บเล็ต: หัว + แท็บเลื่อนแนวนอน */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#0e0a0a]/95 backdrop-blur-xl border-b border-[rgba(240,200,90,.38)]">
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
