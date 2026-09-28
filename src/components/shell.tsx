"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, LangToggle } from "@/i18n/provider";
import { Logo } from "./ui";
import type { ReactNode } from "react";

const icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6"><path d="M3 10.5L12 3l9 7.5V21h-6v-6h-6v6H3v-10.5z" strokeLinejoin="round"/></svg>
  ),
  jobs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18"/></svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6"><path d="M21 12a8 8 0 01-8 8H4l2.5-2.5A8 8 0 1121 12z" strokeLinejoin="round"/></svg>
  ),
  favorites: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6"><path d="M12 21s-7.5-4.8-9.8-9.1C.7 8.9 2.4 5 6.1 5c2.2 0 3.6 1.2 4.4 2.4h3c.8-1.2 2.2-2.4 4.4-2.4 3.7 0 5.4 3.9 3.9 6.9C19.5 16.2 12 21 12 21z"/></svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-3.7 4.4-5.5 8-5.5s6.5 1.8 8 5.5"/></svg>
  ),
};

export function TabBar({ unread = 0 }: { unread?: number }) {
  const { t } = useI18n();
  const path = usePathname();
  const tabs = [
    { href: "/home", key: "home", label: t.nav.home },
    { href: "/jobs", key: "jobs", label: t.nav.jobs },
    { href: "/chat", key: "chat", label: t.nav.chat, badge: unread },
    { href: "/favorites", key: "favorites", label: t.nav.favorites },
    { href: "/profile", key: "profile", label: t.nav.profile },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 border-t border-white/8 bg-ink-950/90 backdrop-blur-xl">
      <div className="grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active = path.startsWith(tab.href);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`relative flex flex-col items-center gap-1 py-2.5 transition-colors
                ${active ? "text-crimson-400" : "text-ink-400 hover:text-ink-200"}`}
            >
              {active && <span className="absolute top-0 w-8 h-0.5 rounded-full bg-gradient-to-r from-crimson-500 to-gold-500" />}
              <span className="relative">
                {icons[tab.key]}
                {"badge" in tab && (tab as { badge?: number }).badge ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-crimson-600 text-[10px] font-bold text-white grid place-items-center">
                    {(tab as { badge: number }).badge}
                  </span>
                ) : null}
              </span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function TopBar({ title, back, right, notis = 0 }: { title?: ReactNode; back?: string; right?: ReactNode; notis?: number }) {
  return (
    <header className="sticky top-0 z-30 bg-ink-950/85 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center gap-3 px-4 h-14">
        {back ? (
          <Link href={back} className="text-ink-200 hover:text-crimson-300 transition" aria-label="back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M15 5l-7 7 7 7" strokeLinecap="round"/></svg>
          </Link>
        ) : (
          <Logo size={30} />
        )}
        <div className="flex-1 min-w-0">
          {typeof title === "string" ? <h1 className="font-semibold truncate">{title}</h1> : title}
        </div>
        {right ?? (
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative text-ink-200 hover:text-gold-300 transition" aria-label="notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6"><path d="M18 10a6 6 0 10-12 0c0 6-2 7-2 7h16s-2-1-2-7M10.3 21a2 2 0 003.4 0"/></svg>
              {notis > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-crimson-500 animate-pulse" />}
            </Link>
            <LangToggle />
          </div>
        )}
      </div>
    </header>
  );
}
