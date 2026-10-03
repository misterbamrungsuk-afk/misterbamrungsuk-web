"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, LangToggle } from "@/i18n/provider";
import { Logo } from "./ui";
import { ModeSwitch, useMode } from "./mode-switch";
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
  const mode = useMode();
  const th = lang === "th";
  // เมนูล่างเปลี่ยนตามโหมด: ลูกค้า / หมอ
  const tabs: Tab[] = mode === "provider"
    ? [
        { href: "/provider", key: "home", label: th ? "แดชบอร์ด" : "Dashboard", match: /^\/provider$|^\/provider\/(earnings|availability|reviews|strikes|job)/ },
        { href: "/jobs", key: "jobs", label: th ? "ประกาศงาน" : "Jobs" },
        { href: "/provider/incoming", key: "incoming", label: th ? "งานเข้า" : "Incoming", center: true },
        { href: "/chat", key: "chat", label: t.nav.chat, badge: unread },
        { href: "/provider/settings", key: "profile", label: th ? "ตั้งค่า" : "Settings" },
      ]
    : [
        { href: "/home", key: "home", label: t.nav.home },
        { href: "/map", key: "map", label: th ? "ใกล้ฉัน" : "Nearby" },
        { href: "/matching", key: "quick", label: t.quickMatch, center: true },
        { href: "/chat", key: "chat", label: t.nav.chat, badge: unread },
        { href: "/profile", key: "profile", label: t.nav.profile },
      ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 border-t border-ink-600 bg-white/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(16,16,24,.05)]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="grid grid-cols-5 h-[68px] items-center">
        {tabs.map((tab) => {
          const active = tab.match ? tab.match.test(path) : path === tab.href || path.startsWith(tab.href + "/");
          if (tab.center) {
            return (
              <Link key={tab.key} href={tab.href} aria-label={tab.label} className="grid place-items-center">
                <span className={`w-12 h-12 rounded-2xl text-white grid place-items-center transition active:scale-95 ${active ? "bg-crimson-600 ring-2 ring-crimson-300" : "bg-crimson-500"}`}>{icons[tab.key]}</span>
              </Link>
            );
          }
          return (
            <Link key={tab.key} href={tab.href}
              className={`relative flex flex-col items-center gap-1 transition-colors ${active ? "text-gold-300" : "text-ink-300 hover:text-ink-200"}`}>
              <span className="relative">
                {icons[tab.key]}
                {tab.badge ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-crimson-500 text-[10px] font-bold text-white grid place-items-center">{tab.badge}</span>
                ) : null}
              </span>
              <span className="text-[11px]">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function TopBar({ title, back, right, notis = 0 }: { title?: ReactNode; back?: string; right?: ReactNode; notis?: number }) {
  const path = usePathname();
  // สวิตช์โหมดแสดงบนหน้าหลักของแต่ละโหมด
  const showMode = !back || path === "/provider" || path === "/jobs";
  return (
    <header className="sticky top-0 z-30 bg-ink-900/90 backdrop-blur-xl border-b border-ink-600/60">
      <div className="flex items-center gap-3 px-4 h-14">
        {back ? (
          <Link href={back} className="w-10 h-10 -ml-1 rounded-full border border-ink-600 grid place-items-center text-ink-100 hover:border-gold-500 transition" aria-label="back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M15 5l-7 7 7 7" strokeLinecap="round"/></svg>
          </Link>
        ) : (
          <Logo size={30} />
        )}
        <div className="flex-1 min-w-0">
          {typeof title === "string" ? <h1 className="font-semibold truncate">{title}</h1> : title}
        </div>
        {right ?? (
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative w-10 h-10 grid place-items-center text-ink-200 hover:text-gold-300 transition" aria-label="notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6"><path d="M18 10a6 6 0 10-12 0c0 6-2 7-2 7h16s-2-1-2-7M10.3 21a2 2 0 003.4 0"/></svg>
              {notis > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-crimson-500 animate-pulse" />}
            </Link>
            <LangToggle />
          </div>
        )}
      </div>
      {showMode && (
        <div className="px-4 pb-2.5">
          <ModeSwitch />
        </div>
      )}
    </header>
  );
}
