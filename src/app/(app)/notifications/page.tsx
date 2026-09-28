"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { DEMO_NOTIS } from "@/lib/demo-data";
import type { AppNotification } from "@/lib/types";

const iconOf = (t: AppNotification["type"]) =>
  ({ chat: "💬", job: "💼", kyc: "🛡️", post: "📝", order: "💰", match: "⚡" })[t] ?? "🔔";

const linkOf = (t: AppNotification["type"]) =>
  ({ chat: "/chat", job: "/jobs", kyc: "/profile/verify", post: "/post/manage", order: "/chat/room1", match: "/matching" })[t] ?? "/home";

export default function NotificationsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState(DEMO_NOTIS);

  return (
    <>
      <TopBar back="/home" title={`🔔 ${t.notifications}`} right={
        <button onClick={() => setItems(items.map((i) => ({ ...i, isRead: true })))} className="chip">{t.markAllRead}</button>
      } />
      <div className="px-4 py-4 grid gap-2">
        {items.map((n) => (
          <Link key={n.id} href={linkOf(n.type)} onClick={() => setItems((xs) => xs.map((x) => x.id === n.id ? { ...x, isRead: true } : x))}
            className={`glass rounded-2xl p-4 flex gap-3 items-start animate-rise ${n.isRead ? "opacity-60" : "border-crimson-500/25"}`}>
            <span className="text-xl">{iconOf(n.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{n.title}</p>
              <p className="text-xs text-ink-400 mt-0.5 line-clamp-2">{n.body}</p>
            </div>
            <span className="text-[10px] text-ink-500">{n.createdAt}</span>
            {!n.isRead && <span className="w-2 h-2 rounded-full bg-crimson-500 mt-1.5" />}
          </Link>
        ))}
      </div>
    </>
  );
}
