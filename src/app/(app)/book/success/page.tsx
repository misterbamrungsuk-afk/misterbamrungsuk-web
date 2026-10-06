"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { baht } from "@/components/ui";
import { DEMO_POSTS } from "@/lib/demo-data";
import { ADDRESSES, thaiDate } from "@/lib/booking";

// จองสำเร็จ — จ่ายเต็มจำนวนแล้ว เงินพักไว้กับเราจนจบนัด
function SuccessInner() {
  const { lang } = useI18n();
  const th = lang === "th";
  const sp = useSearchParams();
  const post = DEMO_POSTS.find((p) => p.id === sp.get("id")) ?? DEMO_POSTS[0];
  const pkg = sp.get("pkg") ?? "180";
  const date = sp.get("date") ?? "";
  const time = sp.get("time") ?? "";
  const total = Number(sp.get("total") ?? 0);
  const addr0 = ADDRESSES.find((a) => a.id === sp.get("addr")) ?? ADDRESSES[0];
  const place = sp.get("place");
  const addr = place ? { th: place, en: place } : addr0;
  const code = "HM-24091"; // เดโม: โหมดจริงได้จากออเดอร์ที่สร้างบนเซิร์ฟเวอร์

  // แจ้งอีเมลยืนยันการจอง (ครั้งเดียว ไม่บล็อกหน้า)
  const notified = useRef(false);
  useEffect(() => {
    if (notified.current) return;
    notified.current = true;
    fetch("/api/notify/booking", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, providerName: post.member.name, date, time, minutes: pkg, total, place: addr.th }),
    }).catch(() => {});
  }, [code, post.member.name, date, time, pkg, total, addr.th]);

  // เพิ่มลงปฏิทิน: ไฟล์ .ics สร้างในเครื่อง ไม่ส่งข้อมูลออก
  const icsHref = (() => {
    if (!date || !time) return "";
    const start = `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;
    const endD = new Date(`${date}T${time}:00`);
    endD.setMinutes(endD.getMinutes() + Number(pkg));
    const p = (n: number) => String(n).padStart(2, "0");
    const end = `${endD.getFullYear()}${p(endD.getMonth() + 1)}${p(endD.getDate())}T${p(endD.getHours())}${p(endD.getMinutes())}00`;
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:Mister Bamrungsuk · นัดกับ ${post.member.name}`, `DESCRIPTION:รหัสจอง ${code}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  })();

  const share = async () => {
    const text = `${th ? "นัด Mister Bamrungsuk" : "Mister Bamrungsuk booking"} ${thaiDate(date)} ${time} · ${post.member.name} · ${code}`;
    try {
      if (navigator.share) await navigator.share({ title: "Mister Bamrungsuk", text });
      else await navigator.clipboard.writeText(text);
    } catch { /* ผู้ใช้ยกเลิก */ }
  };

  return (
    <main className="px-4 pt-12 pb-10 flex flex-col items-center text-center gap-2 animate-rise">
      <div className="w-24 h-24 rounded-full border border-gold-500 grid place-items-center text-gold-500">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-12 h-12"><path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <h1 className="text-[28px] font-semibold mt-3">{th ? "จองสำเร็จ" : "Booked!"}</h1>
      <p className="text-sm text-ink-300 max-w-[300px]">{th ? `เงิน ${baht(total)} ถูกกันในระบบกลางแล้ว ${post.member.name} ยืนยันนัดของคุณ` : `${baht(total)} is held in escrow. ${post.member.name} confirmed your booking.`}</p>

      <section className="glass rounded-2xl w-full mt-5 px-4 py-2 text-left text-sm">
        <div className="flex items-center gap-3 py-3 border-b border-ink-600">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.member.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
          <div className="flex-1 min-w-0"><p className="font-display font-semibold truncate">{post.member.name}</p><p className="text-xs text-ink-300">{Math.round(Number(pkg) / 60)} {th ? "ชม." : "h"}</p></div>
        </div>
        <div className="flex justify-between py-2.5 border-b border-ink-600"><span className="text-ink-300">{th ? "วันเวลา" : "When"}</span><span>{date ? thaiDate(date) : "-"} · {time || "-"}</span></div>
        <div className="flex justify-between py-2.5 border-b border-ink-600"><span className="text-ink-300">{th ? "สถานที่" : "Where"}</span><span>{th ? addr.th : addr.en}</span></div>
        <div className="flex justify-between py-2.5"><span className="text-ink-300">{th ? "รหัสจอง" : "Booking ID"}</span><span className="font-display tracking-wider text-gold-300">{code}</span></div>
      </section>

      <div className="grid grid-cols-2 gap-2 w-full mt-2">
        {icsHref ? (
          <a href={icsHref} download={`mord-${code}.ics`} className="h-12 rounded-xl border border-ink-600 text-sm flex items-center justify-center">{th ? "เพิ่มลงปฏิทิน" : "Add to calendar"}</a>
        ) : <span />}
        <button onClick={share} className="h-12 rounded-xl border border-ink-600 text-sm">{th ? "แชร์ให้คนใกล้ชิด" : "Share with someone"}</button>
      </div>
      <p className="text-xs text-ink-300 mt-2">{th ? "เราจะแจ้งเตือนก่อนนัด 1 ชม. และตอนเพื่อนเริ่มเดินทาง" : "We'll remind you 1h before and when your companion sets off"}</p>

      <div className="w-full flex flex-col gap-2 mt-4">
        <Link href="/chat/room1" className="btn-crimson h-14 rounded-2xl font-display font-semibold text-lg flex items-center justify-center">{th ? "แชทกับเพื่อน" : "Chat with your companion"}</Link>
        <Link href="/escrow/o1" className="h-12 rounded-2xl border border-gold-500 text-gold-300 flex items-center justify-center">{th ? "ดูเงินในระบบกลาง" : "View escrow"}</Link>
        <Link href="/orders" className="h-12 rounded-2xl border border-ink-600 flex items-center justify-center">{th ? "ออเดอร์ของฉัน" : "My orders"}</Link>
      </div>
    </main>
  );
}

export default function BookSuccessPage() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}
