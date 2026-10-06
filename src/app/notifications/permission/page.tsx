"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";

type Perm = NotificationPermission | "unsupported";

export default function NotifyPermissionPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const [perm, setPerm] = useState<Perm>("default");

  useEffect(() => {
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  async function allow() {
    if (typeof Notification === "undefined") { setPerm("unsupported"); return; }
    try { setPerm(await Notification.requestPermission()); } catch { setPerm(Notification.permission); }
  }

  const items = [
    { i: "✅", t: th ? "เพื่อนตอบรับนัดแล้ว" : "Companion accepted", d: th ? "รู้ทันทีเมื่อการจองได้รับการยืนยัน" : "Know instantly when booking is confirmed" },
    { i: "🚗", t: th ? "เพื่อนกำลังเดินทาง" : "On the way", d: th ? "แจ้งเวลาถึงโดยประมาณ" : "Estimated arrival updates" },
    { i: "💬", t: th ? "แชทใหม่" : "New messages", d: th ? "ไม่พลาดข้อความจากเพื่อน" : "Never miss a message" },
  ];
  const result: Record<Perm, string> = {
    granted: th ? "✓ เปิดการแจ้งเตือนแล้ว" : "✓ Notifications enabled",
    denied: th ? "ถูกปิดไว้ — เปิดได้ในการตั้งค่าเบราว์เซอร์" : "Blocked — enable in browser settings",
    default: "",
    unsupported: th ? "อุปกรณ์นี้ไม่รองรับการแจ้งเตือน" : "Notifications not supported on this device",
  };

  return (
    <main className="min-h-dvh bg-ink-950 text-ink-100 mx-auto max-w-[480px] px-5 py-8 flex flex-col overflow-x-hidden">
      <div className="flex-1 flex flex-col items-center text-center">
        <div className="w-28 h-28 rounded-full glass grid place-items-center text-5xl mt-6">🔔</div>
        <h1 className="font-display text-2xl font-bold mt-6">{th ? "เปิดการแจ้งเตือน" : "Turn on notifications"}</h1>
        <p className="text-ink-400 text-sm mt-2 max-w-xs">{th ? "รับข่าวสารสำคัญเกี่ยวกับการจองของคุณแบบเรียลไทม์" : "Get real-time updates about your bookings"}</p>
        <div className="glass rounded-3xl p-2 mt-6 w-full text-left">
          {items.map((x) => (
            <div key={x.t} className="flex gap-3 items-center p-3">
              <span className="text-xl">{x.i}</span>
              <div><p className="font-semibold text-sm">{x.t}</p><p className="text-xs text-ink-400">{x.d}</p></div>
            </div>
          ))}
        </div>
        {result[perm] && <p className={`mt-4 text-sm ${perm === "granted" ? "text-emerald-400" : "text-gold-300"}`}>{result[perm]}</p>}
      </div>
      {perm === "granted" ? (
        <Link href="/home" className="btn-crimson rounded-full h-14 grid place-items-center font-semibold mt-6">{th ? "ไปหน้าแรก" : "Go to home"}</Link>
      ) : (
        <button onClick={allow} disabled={perm === "unsupported"} className="btn-crimson rounded-full h-14 font-semibold mt-6">{th ? "อนุญาตการแจ้งเตือน" : "Allow notifications"}</button>
      )}
      <Link href="/home" className="text-center text-ink-300 h-12 grid place-items-center mt-2">{th ? "ไว้ทีหลัง" : "Later"}</Link>
    </main>
  );
}
