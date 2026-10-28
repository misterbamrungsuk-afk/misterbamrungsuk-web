"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui";
import { Fragment, useEffect, useRef, useState } from "react";
import { ROLE_LABEL, canAccess, type AdminRole } from "@/lib/admin-auth";
import { ModeSwitch } from "@/components/mode-switch";

export type AdminTab = { href: string; label: string; exact?: boolean; divider?: boolean; badge?: number; group?: string };
// เมนูแบ่งตามระบบหลัก (บอส/SIRI 24 ต.ค. 2569): Part-Time · Partner สปา/โรงแรม · Collab MB x Bars · ร้านค้า Marketplace — ภายในเป็นหน้าบริหารย่อย
export const ADMIN_GROUPS = ["ภาพรวม · การเงิน", "ระบบ Part-Time", "ระบบ Partner สปา · โรงแรม", "ระบบ Collab · MB x Bars", "ระบบร้านค้า Marketplace", "ลูกค้า", "ตั้งค่า"] as const;
export const ADMIN_TABS: AdminTab[] = [
  { group: "ภาพรวม · การเงิน", href: "/admin", label: "ภาพรวม", exact: true },
  { group: "ภาพรวม · การเงิน", href: "/admin/traffic", label: "สถิติผู้เข้าชมเว็บ" },
  { group: "ภาพรวม · การเงิน", href: "/admin/income", label: "ยอดเงินเข้า · ใครโอน จากระบบไหน" },
  { group: "ภาพรวม · การเงิน", href: "/admin/payroll", label: "CEO · อนุมัติรายได้ / ถอน" },
  { group: "ภาพรวม · การเงิน", href: "/admin/wallets", label: "กระเป๋าเงินทุกคน" },
  { group: "ภาพรวม · การเงิน", href: "/admin/payouts", label: "โอนเงินออก · Part-Time / พาร์ทเนอร์ / ร้านค้า" },
  { group: "ภาพรวม · การเงิน", href: "/admin/audit", label: "SOS · แจ้งเตือนระบบ" },
  { group: "ระบบ Part-Time", href: "/admin/applicants", label: "ผู้สมัคร · Active / Non Active" },
  { group: "ระบบ Part-Time", href: "/admin/slips", label: "ตรวจสลิปค่าสมัคร · Slip2Go" },
  { group: "ระบบ Part-Time", href: "/admin/kyc", label: "คิว KYC" },
  { group: "ระบบ Part-Time", href: "/admin/cohorts", label: "กลุ่มอบรม / เช็กชื่อ" },
  { group: "ระบบ Part-Time", href: "/admin/earnings", label: "ราคาและส่วนแบ่ง" },
  { group: "ระบบ Part-Time", href: "/admin/invites", label: "ลิงก์เชิญ · Secret" },
  { group: "ระบบ Part-Time", href: "/admin/boosts", label: "โปรโมทโปรไฟล์" },
  { group: "ระบบ Part-Time", href: "/admin/sales", label: "Recruit · เมมเบอร์" },
  { group: "ระบบ Part-Time", href: "/admin/recruit-programs", label: "โปรแกรม Recruit · กำหนดราคา" },
  { group: "ระบบ Part-Time", href: "/admin/line-groups", label: "กลุ่ม LINE · ปุ่มเข้ากลุ่ม" },
  { group: "ระบบ Part-Time", href: "/admin/orders", label: "ตรวจงาน" },
  { group: "ระบบ Part-Time", href: "/admin/chats", label: "แชท · คำห้ามส่ง" },
  { group: "ระบบ Part-Time", href: "/admin/appeals", label: "อุทธรณ์ใบเตือน" },
  { group: "ระบบ Part-Time", href: "/admin/reports", label: "รายงานผู้ใช้" },
  { group: "ระบบ Partner สปา · โรงแรม", href: "/admin/partners", label: "พาร์ทเนอร์ / พื้นที่โปรโมท" },
  { group: "ระบบ Partner สปา · โรงแรม", href: "/admin/stays", label: "จองห้องพัก" },
  { group: "ระบบ Collab · MB x Bars", href: "/admin/collab", label: "Collab MB x Bars" },
  { group: "ระบบร้านค้า Marketplace", href: "/admin/market", label: "ร้านค้า Marketplace" },
  { group: "ระบบร้านค้า Marketplace", href: "/admin/promos", label: "โค้ดโปรโมชัน · ของขวัญ" },
  { group: "ลูกค้า", href: "/admin/members", label: "สมาชิกลูกค้า" },
  { group: "ลูกค้า", href: "/admin/wallet", label: "กระเป๋าเงิน · เติมเงิน" },
  { group: "ตั้งค่า", href: "/admin/covers", label: "รูปหน้าปก" },
  { group: "ตั้งค่า", href: "/admin/errors", label: "ข้อผิดพลาดหน้าเว็บ" },
  { group: "ตั้งค่า", href: "/admin/security", label: "ความปลอดภัยบัญชี" },
];

/** เมนูซ้ายแบบการ์ดระบบ (canvas "Admin Light Theme" · 25 ต.ค. 2569) — ระบบที่เปิดอยู่กางเมนูย่อยเป็นหมวด */
type NavSystem = { key: string; title: string; full: string; sub: string; icon: string; tint: string; sections: { label: string; hrefs: string[] }[] };
const ICONS: Record<string, string> = {
  people: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.75",
  hotel: "M3 21h18M5 21V5l7-3 7 3v16M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4",
  glass: "M8 22h8M12 15v7M6 3h12l-1 6a5 5 0 0 1-10 0z",
  shop: "M3 9l2-5h14l2 5M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0zM5 13v8h14v-8",
  user: "M20 21v-1a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
};
export const NAV_SYSTEMS: NavSystem[] = [
  { key: "pt", title: "ระบบ Part-Time", full: "ระบบ Part-Time", sub: "ผู้สมัคร · การเงิน · SOS", icon: "people", tint: "#f6e3b4", sections: [
    { label: "ผู้สมัคร · อบรม", hrefs: ["/admin/applicants", "/admin/slips", "/admin/kyc", "/admin/cohorts", "/admin/earnings", "/admin/invites", "/admin/boosts", "/admin/sales", "/admin/recruit-programs", "/admin/line-groups"] },
    { label: "งาน · ดูแล", hrefs: ["/admin/orders", "/admin/chats", "/admin/appeals", "/admin/reports"] },
    { label: "การเงิน", hrefs: ["/admin", "/admin/income", "/admin/wallets", "/admin/payroll", "/admin/payouts"] },
    { label: "ความปลอดภัย", hrefs: ["/admin/audit"] },
  ] },
  { key: "partner", title: "ระบบ Partner", full: "ระบบ Partner สปา · โรงแรม", sub: "สปา · โรงแรม", icon: "hotel", tint: "#dfe9f5", sections: [{ label: "", hrefs: ["/admin/partners", "/admin/stays"] }] },
  { key: "collab", title: "ระบบ Collab", full: "ระบบ Collab · MB x Bars", sub: "MB x Bars", icon: "glass", tint: "#ece4f8", sections: [{ label: "", hrefs: ["/admin/collab"] }] },
  { key: "market", title: "ระบบร้านค้า", full: "ระบบร้านค้า Marketplace", sub: "Market Place", icon: "shop", tint: "#f8e1e6", sections: [{ label: "", hrefs: ["/admin/market", "/admin/promos"] }] },
  { key: "customer", title: "ลูกค้า · เว็บ", full: "ลูกค้า", sub: "สมาชิก · กระเป๋า · สถิติ", icon: "user", tint: "#e3f1e6", sections: [{ label: "", hrefs: ["/admin/members", "/admin/wallet", "/admin/traffic"] }] },
  { key: "settings", title: "ตั้งค่า", full: "ตั้งค่า", sub: "รูปปก · ข้อผิดพลาด · บัญชี", icon: "gear", tint: "#efe9e1", sections: [{ label: "", hrefs: ["/admin/covers", "/admin/errors", "/admin/security"] }] },
];
const NAV_LABEL: Record<string, string> = { "/admin": "ภาพรวมการเงิน", "/admin/income": "ยอดเงินเข้า · ใครโอน", "/admin/payouts": "โอนเงินออก · Part-Time", "/admin/audit": "SOS · แจ้งเตือน" };
const Icon = ({ d }: { d: string }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

export function AdminNav({ email, role }: { email: string; role: AdminRole }) {
  const path = usePathname();
  const tabs = ADMIN_TABS.filter((t) => canAccess(role, t.href));
  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin-login";
  };
  const isOn = (t: AdminTab) => (t.exact ? path === t.href : path.startsWith(t.href));
  const byHref = new Map(tabs.map((t) => [t.href, t]));
  const systems = NAV_SYSTEMS.map((sy) => ({ ...sy, sections: sy.sections.map((sec) => ({ ...sec, tabs: sec.hrefs.map((h) => byHref.get(h)).filter((t): t is AdminTab => !!t) })).filter((sec) => sec.tabs.length) })).filter((sy) => sy.sections.length);
  const activeKey = systems.find((sy) => sy.sections.some((sec) => sec.tabs.some(isOn)))?.key ?? null;
  const [open, setOpen] = useState<string | null>(activeKey);
  useEffect(() => { if (activeKey) setOpen(activeKey); }, [activeKey]);
  // มือถือ: เลื่อนแท็บที่เปิดอยู่ให้อยู่ในจอ (แท็บท้าย ๆ เช่น "รูปหน้าปก" ไม่หลุดขอบขวา)
  const chips = useRef<HTMLElement>(null);
  useEffect(() => {
    // เลื่อนเฉพาะแถบแท็บเอง — scrollIntoView ลากทั้งหน้าให้เลื่อนข้างได้บนจอแคบ (iPhone SE)
    const nav = chips.current, el = nav?.querySelector<HTMLElement>("[aria-current=page]");
    if (nav && el) nav.scrollLeft = Math.max(0, el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2);
  }, [path]);

  return (
    <>
      {/* จอใหญ่: เมนูซ้ายแบบการ์ดระบบ (ธีมสว่าง) · สูงเท่าจอ เลื่อนภายใน · โหมด/ออกจากระบบค้างล่าง */}
      <nav aria-label="เมนูแอดมิน" className="hidden lg:flex w-[276px] shrink-0 flex-col sticky top-0 h-dvh p-4 pr-0">
        <div className="flex-1 min-h-0 flex flex-col rounded-[26px] bg-[var(--al-panel)] p-3.5 overflow-hidden">
          <div className="flex items-center gap-3 px-2 pt-1.5 pb-4 shrink-0">
            <span className="w-12 h-12 rounded-2xl grid place-items-center font-lux font-bold text-[17px] text-[#8a6516]" style={{ background: "#f3dfa8" }}>MB</span>
            <div className="leading-[1.25] min-w-0">
              <div className="font-lux font-bold text-[15.5px] whitespace-nowrap text-[var(--al-text)]">Mister Bamrungsuk</div>
              <div className="text-[12.5px] text-[var(--al-muted)] truncate">Admin · {ROLE_LABEL[role]}</div>
            </div>
          </div>
          <div className="px-2 pb-2 text-[12px] font-semibold text-[#a8781f] shrink-0">ระบบหลัก</div>
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-2 pb-2">
            {systems.map((sy) => {
              const opened = open === sy.key;
              const live = sy.key === activeKey;
              return (
                <div key={sy.key} data-nav-group={sy.full} className={`shrink-0 rounded-[18px] ${opened ? "bg-white shadow-[0_6px_20px_rgba(90,60,20,.08)] p-1.5" : ""}`}>
                  <button type="button" onClick={() => setOpen(opened ? null : sy.key)} aria-expanded={opened} title={sy.full}
                    className={`w-full flex items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-left transition ${opened ? "bg-[#fbefcf]" : "hover:bg-white/60"}`}>
                    <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0 text-[#6b4f1d]" style={{ background: sy.tint }}><Icon d={ICONS[sy.icon]} /></span>
                    <span className="flex-1 min-w-0 leading-tight">
                      <span className="block text-[14.5px] font-bold text-[var(--al-text)]">{sy.title}</span>
                      <span className="block text-[12px] text-[var(--al-muted)] truncate">{sy.sub}</span>
                    </span>
                    {live && !opened && <span className="w-2 h-2 rounded-full bg-[#c9a24a] shrink-0" />}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a7b75" strokeWidth="2" aria-hidden="true" className={`shrink-0 transition ${opened ? "rotate-90" : ""}`}><path d="m9 6 6 6-6 6" /></svg>
                  </button>
                  {opened && (
                    <div className="flex flex-col pt-1.5 pb-1">
                      {sy.sections.map((sec) => (
                        <Fragment key={sec.label || sy.key}>
                          {sec.label && <div className="px-4 pt-2.5 pb-1 text-[11.5px] font-semibold text-[var(--al-muted)]">{sec.label}</div>}
                          {sec.tabs.map((t) => (
                            <Link key={t.href} href={t.href} aria-current={isOn(t) ? "page" : undefined}
                              className={`relative flex items-center gap-2 mx-1 pl-7 pr-3 py-2 rounded-xl text-[13.5px] leading-snug transition ${isOn(t) ? "bg-[#f5ecdc] text-[var(--al-text)] font-semibold" : "text-[var(--al-text2)] hover:bg-[#faf5ec]"}`}>
                              {isOn(t) && <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#c9a24a]" />}
                              <span className="flex-1">{NAV_LABEL[t.href] ?? t.label}</span>
                              {t.href === "/admin/audit" && <span className="min-w-6 h-6 px-1.5 rounded-full grid place-items-center text-[11.5px] font-semibold text-[#b42335] bg-[#fde8eb]">{t.badge ?? 0}</span>}
                              {t.href !== "/admin/audit" && "badge" in t && t.badge ? <span className="min-w-5 h-5 px-1.5 rounded-full bg-crimson-500 text-white text-[11px] grid place-items-center">{t.badge}</span> : null}
                            </Link>
                          ))}
                        </Fragment>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="shrink-0 pt-3 border-t border-[var(--al-line)] flex flex-col gap-2">
            <ModeSwitch />
            <div className="flex items-center gap-2 px-1">
              <p className="flex-1 min-w-0 m-0 text-[12px] text-[var(--al-muted)] truncate" title={email}>{email}</p>
              <button onClick={logout} className="shrink-0 h-8 px-3 rounded-full border border-[var(--al-line)] bg-white text-[12px] text-[var(--al-text2)] hover:border-[#c9a24a]">ออกจากระบบ</button>
            </div>
            <Link href="/" className="px-1 text-[12.5px] text-[#a8781f]">← กลับหน้าแอป</Link>
          </div>
        </div>
      </nav>

      {/* มือถือ/แท็บเล็ต: หัว + แท็บเลื่อนแนวนอน */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#f6f0e7]/95 backdrop-blur-xl border-b border-[var(--al-line)]">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/" aria-label="กลับหน้าแอป" className="w-10 h-10 -ml-1 rounded-full border border-ink-600 grid place-items-center text-xl leading-none">‹</Link>
          <Logo size={26} />
          <span className="text-[11px] font-semibold tracking-[0.15em] text-[#a8781f]">ADMIN</span>
          <span className="ml-auto text-[11px] text-ink-300 truncate max-w-[90px]">{ROLE_LABEL[role]}</span>
          <button onClick={logout} className="text-xs text-crimson-200 min-h-9 px-2">ออก</button>
        </div>
        <div className="px-4 pb-2.5 flex items-center gap-2"><div className="flex-1 min-w-0"><ModeSwitch /></div><Link href="/" className="shrink-0 text-[12px] text-[#ffd76a] min-h-9 px-1 inline-flex items-center">กลับหน้าแอป</Link></div>
        <nav ref={chips} aria-label="เมนูแอดมิน (มือถือ)" className="relative flex gap-2 overflow-x-auto overscroll-x-contain no-scrollbar max-w-full min-w-0 px-4 pb-3">
          {tabs.map((t, i) => (
            <Fragment key={t.href}>
            {t.group && t.group !== tabs[i - 1]?.group && <span className="shrink-0 self-center text-[11px] font-semibold text-[#a8781f] whitespace-nowrap pl-1">{t.group}</span>}
            <Link href={t.href} aria-current={isOn(t) ? "page" : undefined} className={`chip whitespace-nowrap h-9 px-3.5 inline-flex items-center gap-1.5 ${isOn(t) ? "!bg-[#2a1d1a] !text-white !border-[#2a1d1a]" : ""}`}>
              {t.label}
              {"badge" in t && t.badge ? <span className="min-w-4 h-4 px-1 rounded-full bg-crimson-500 text-white text-[10px] grid place-items-center">{t.badge}</span> : null}
            </Link>
            </Fragment>
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
        <h1 className="font-lux text-[26px] lg:text-[34px] font-bold leading-tight">{title}</h1>
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
  return <section className={`rounded-[20px] border border-[var(--al-line)] bg-white shadow-[0_4px_18px_rgba(90,60,20,.05)] p-4 lg:p-5 ${className}`}>{children}</section>;
}
