"use client";
/* eslint-disable @next/next/no-img-element */

// บอร์ด C-Chats "แชท" — 1 ห้องต่อ 1 การจอง (คุยได้ตั้งแต่ส่งคำขอจนจบนัด)
import { useEffect, useState } from "react";
import Link from "next/link";

const LN = "rgba(243,234,217,0.07)";
type B = { id: string; code: string; status: string; starts_at: string; hours: number; place: { label: string }; pt: { nick: string; img: string } };
const OPEN = ["requested", "accepted", "checked_in", "cancel_requested"];
const SUB: Record<string, string> = { requested: "รอเพื่อนตอบรับ", accepted: "ยืนยันนัดแล้ว", checked_in: "ระหว่างนัด", cancel_requested: "ขอยกเลิก · รอทีมงาน" };

export default function ChatsPage() {
  const [rows, setRows] = useState<B[] | null>(null);
  useEffect(() => { fetch("/api/bookings", { cache: "no-store" }).then((r) => r.json()).then((d) => setRows(d?.ok ? d.bookings : [])).catch(() => setRows([])); }, []);
  const open = (rows ?? []).filter((b) => OPEN.includes(b.status)).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  return (
    <div className="pb-6">
      <div style={{ padding: "18px 16px 12px" }}><h1 className="m-0 font-semibold text-[28px]">แชท</h1></div>
      <div className="flex flex-col gap-2" style={{ padding: "0 16px" }}>
        {rows === null ? <p className="m-0 text-[13px] font-light text-[#b5a596]">กำลังโหลด…</p> : !open.length ? (
          <div className="rounded-[20px] bg-[#211a18] flex flex-col items-center gap-3 text-center" style={{ padding: 28, border: `1px solid ${LN}` }}>
            <span className="text-[14px] text-[#d9c9b4]">ยังไม่มีห้องแชท · ห้องแชทเปิดเมื่อคุณส่งคำขอนัดเพื่อน</span>
            <Link href="/" className="h-11 px-5 rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">เลือกเพื่อน</Link>
          </div>
        ) : open.map((b) => (
          <Link key={b.id} href={`/chat/${b.id}`} className="flex gap-3 items-center rounded-2xl bg-[#211a18] text-[#f3ead9] hover:text-[#f3ead9]" style={{ padding: 12, border: `1px solid ${LN}` }}>
            <img src={b.pt.img} alt="" className="w-[52px] h-[52px] rounded-full object-cover shrink-0" />
            <span className="flex-1 min-w-0"><b className="font-medium text-[15px]">{b.pt.nick}</b><span className="block text-[12.5px] font-light text-[#d9c9b4] truncate">{SUB[b.status]} · {b.place.label} {b.hours} ชม. · {new Date(b.starts_at).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d9c9b4" strokeWidth="1.8" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
