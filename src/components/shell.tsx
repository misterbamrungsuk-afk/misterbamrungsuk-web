"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { Logo } from "./ui";
import type { ReactNode } from "react";

const icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6"><path d="M3 10.5L12 3l9 7.5V21h-6v-6h-6v6H3v-10.5z" strokeLinejoin="round"/></svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
  ),
  quick: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6"><path d="M21 12a8 8 0 01-8 8H4l2.5-2.5A8 8 0 1121 12z" strokeLinejoin="round"/></svg>
  ),
  jobs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></svg>
  ),
  incoming: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M18 10a6 6 0 10-12 0c0 6-2 7-2 7h16s-2-1-2-7M10.3 21a2 2 0 003.4 0" strokeLinecap="round"/></svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-3.7 4.4-5.5 8-5.5s6.5 1.8 8 5.5"/></svg>
  ),
};

type Tab = { href: string; key: keyof typeof icons; label: string; center?: boolean; badge?: number; match?: RegExp };

export function TabBar({ unread = 0 }: { unread?: number }) {
  const { t, lang } = useI18n();
  const path = usePathname();
  const th = lang === "th";
  // เมนูล่างเปลี่ยนตามโหมด: ลูกค้า / Part-Time
  // โหมด Part-Time เดิมเลิกใช้ (Part-Time ใช้หน้า /join/profile/[mb]) → เมนูลูกค้าเสมอ
  const tabs: Tab[] = [
        // บอร์ด C-Home: หน้าแรก · แผนที่ · เรียกด่วน (ปุ่มทองกลาง) · แชท · บัญชี
        { href: "/", key: "home", label: "หน้าแรก", match: /^\/$|^\/home$/ },
        { href: "/map", key: "map", label: "แผนที่" },
        { href: "/quick", key: "quick", label: "เรียกด่วน", center: true },
        { href: "/chat", key: "chat", label: "แชท", badge: unread },
        { href: "/profile", key: "profile", label: "บัญชี" },
      ];

  return (
    <nav aria-label="เมนูหลัก" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[640px] z-40 font-light md:rounded-t-2xl" style={{ background: "#251d1b", borderTop: "1px solid rgba(243,234,217,0.07)", color: "#b5a596", paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}>
      <div className="grid grid-cols-5 h-[66px] items-center text-center">
        {tabs.map((tab) => {
          const active = tab.match ? tab.match.test(path) : path === tab.href || path.startsWith(tab.href + "/");
          if (tab.center) {
            return (
              <Link key={tab.key} href={tab.href} aria-label={tab.label} className="flex flex-col items-center gap-0.5 text-[12px] text-[#e8c472] hover:text-[#e8c472]">
                <span className="w-12 h-12 -mt-[18px] rounded-2xl bg-[#e8c472] text-[#1b130b] grid place-items-center transition active:scale-95" style={{ boxShadow: active ? "0 0 0 3px rgba(232,196,114,.3)" : "none" }}>{icons[tab.key]}</span>
                {tab.label}
              </Link>
            );
          }
          return (
            <Link key={tab.key} href={tab.href}
              aria-current={active ? "page" : undefined} className="relative min-h-12 flex flex-col items-center justify-center gap-[3px]" style={{ color: active ? "#e8c472" : "inherit" }}>
              <span className="relative">
                {icons[tab.key]}
                {tab.badge ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#e8c472] text-[10px] font-semibold text-[#1b130b] grid place-items-center">{tab.badge}</span>
                ) : null}
              </span>
              <span className="text-[12px]">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function TopBar({ title, back, right, notis = 0 }: { title?: ReactNode; back?: string; right?: ReactNode; notis?: number }) {
  // หัวหน้าตามบอร์ด C-* : พื้น #251d1b สูง 64 · ปุ่มกลับ 44px · ไม่มีตัวสลับภาษา
  return (
    <header className="sticky top-0 z-30" style={{ background: "#251d1b" }}>
      <div className="flex items-center gap-3 px-4 h-16">
        {back ? (
          <Link href={back} className="w-11 h-11 shrink-0 rounded-full bg-[#211a18] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" aria-label="ย้อนกลับ">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M15 5l-7 7 7 7" strokeLinecap="round"/></svg>
          </Link>
        ) : (
          <Link href="/" aria-label="หน้าแรก"><Logo size={30} /></Link>
        )}
        <div className="flex-1 min-w-0">
          {typeof title === "string" ? <h1 className="m-0 font-semibold text-[18px] truncate">{title}</h1> : title}
        </div>
        {right ?? (
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative w-11 h-11 rounded-full grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ background: "rgba(232,196,114,0.16)" }} aria-label="การแจ้งเตือน">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6"><path d="M18 10a6 6 0 10-12 0c0 6-2 7-2 7h16s-2-1-2-7M10.3 21a2 2 0 003.4 0"/></svg>
              {notis > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#ff8a9a]" />}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
