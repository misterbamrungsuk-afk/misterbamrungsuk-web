"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { baht } from "@/components/ui";
import { DEMO_MY_ORDERS, DEMO_POSTS } from "@/lib/demo-data";
import SOSButton from "@/components/sos";

// ระหว่างนวด (ฝั่งลูกค้า): นับเวลาถอยหลัง ต่อเวลาได้ SOS อยู่ใกล้มือ
const PACKAGE_MIN = 90;
const STARTED_MIN_AGO = 72; // เดโม: เริ่มนวดมาแล้ว 72 นาที

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useI18n();
  const th = lang === "th";
  const order = DEMO_MY_ORDERS.find((o) => o.id === id) ?? DEMO_MY_ORDERS[0];
  const post = DEMO_POSTS.find((p) => p.member.id === order.provider.id);
  const rate = post?.pricePerHour ?? 600;

  const [elapsed, setElapsed] = useState(STARTED_MIN_AGO * 60);
  const [extra, setExtra] = useState(0); // นาทีที่ต่อเพิ่ม
  const [confirmExtend, setConfirmExtend] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const totalSec = (PACKAGE_MIN + extra) * 60;
  const left = Math.max(0, totalSec - elapsed);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const pct = Math.min(1, elapsed / totalSec);
  const C = 2 * Math.PI * 90;
  const extendCost = Math.round((rate * 30) / 60 / 10) * 10;

  return (
    <main className="min-h-dvh flex flex-col px-4 pt-4 pb-6">
      <header className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={order.provider.avatar} alt="" className="w-11 h-11 rounded-full object-cover border border-gold-500" />
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold truncate">{th ? `${order.provider.name} กำลังนวดให้คุณ` : `${order.provider.name} is with you`}</p>
          <p className="text-xs text-ink-300">{PACKAGE_MIN + extra} {th ? "นาที" : "min"} · {order.id.toUpperCase()}</p>
        </div>
      </header>

      <div className="relative w-[260px] h-[260px] mx-auto mt-8">
        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
          <circle cx="100" cy="100" r="90" stroke="var(--color-ink-600)" strokeWidth="6" fill="none" />
          <circle cx="100" cy="100" r="90" stroke="var(--color-gold-500)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" role="timer" aria-live="off">
          <span className="text-sm text-ink-300">{left ? (th ? "เหลืออีก" : "Time left") : th ? "ครบเวลาแล้ว" : "Time's up"}</span>
          <span className="font-display font-semibold text-[56px] leading-tight tabular-nums">{mm}:{ss}</span>
          <span className="text-sm text-gold-300">{th ? "นวดไปแล้ว" : "Elapsed"} {Math.floor(elapsed / 60)} {th ? "นาที" : "min"}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-8">
        <button onClick={() => setConfirmExtend(true)} className="h-16 rounded-2xl border border-ink-600 bg-ink-800 text-xs flex flex-col items-center justify-center gap-1">
          <span className="text-lg leading-none">＋</span>{th ? "ต่อเวลา 30 นาที" : "Extend 30 min"}
        </button>
        <Link href={`/chat/${order.roomId || "room1"}`} className="h-16 rounded-2xl border border-ink-600 bg-ink-800 text-xs flex flex-col items-center justify-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>{th ? "แชทกับหมอ" : "Chat"}
        </Link>
        <Link href="/escrow/o1" className="h-16 rounded-2xl border border-ink-600 bg-ink-800 text-xs flex flex-col items-center justify-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-gold-500"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>{th ? "ระบบกลางเงิน" : "Escrow"}
        </Link>
      </div>

      {confirmExtend && (
        <div className="mt-3 rounded-2xl border border-gold-500 bg-gold-500/5 p-4 flex flex-col gap-3 animate-rise">
          <p className="text-sm">{th ? `ต่อเวลา 30 นาที เพิ่ม ${baht(extendCost)} จะส่งคำขอให้หมอยืนยันและเรียกเก็บผ่านระบบกลาง` : `Extend 30 min for ${baht(extendCost)}? Your therapist confirms; charged via escrow.`}</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmExtend(false)} className="flex-1 h-11 rounded-xl border border-ink-600">{th ? "ไม่ต่อ" : "Cancel"}</button>
            <button onClick={() => { setExtra((e) => e + 30); setConfirmExtend(false); }} className="flex-1 h-11 rounded-xl bg-gold-500 text-ink-950 font-semibold">{th ? "ยืนยันต่อเวลา" : "Confirm"}</button>
          </div>
        </div>
      )}
      {extra > 0 && <p className="text-xs text-gold-300 text-center mt-3">{th ? `ต่อเวลาแล้ว ${extra} นาที · +${baht((extra / 30) * extendCost)}` : `Extended ${extra} min · +${baht((extra / 30) * extendCost)}`}</p>}

      <p className="mt-4 rounded-2xl border border-gold-500/40 p-3.5 text-sm flex gap-2.5 items-start">
        <span className="text-gold-500">🔒</span>{th ? "เงินยังอยู่ในระบบกลาง จะปล่อยให้หมอเมื่อคุณยืนยันหลังจบงาน" : "Money stays in escrow until you confirm after the session"}
      </p>

      <div className="mt-auto pt-6 flex flex-col gap-2">
        <Link href={`/order/${order.id}/complete?extra=${extra}`} className="btn-crimson h-14 rounded-2xl font-display font-semibold text-lg flex items-center justify-center">{th ? "จบการนวด" : "End session"}</Link>
        <p className="text-xs text-ink-300 text-center">{th ? "ตำแหน่งของคุณแชร์ให้แอดมินตลอดการนวด เพื่อความปลอดภัย" : "Your location is shared with our team during the session"}</p>
      </div>
      <SOSButton />
    </main>
  );
}
