"use client";
/* eslint-disable @next/next/no-img-element */

// บอร์ด C-Chats "แชท" — 1 ห้องต่อ 1 การจอง (คุยได้ตั้งแต่ส่งคำขอจนจบนัด)
// เมนู ⋯ ต่อแถว: ซ่อนแชท / ลบกล่องแชท (เฉพาะฝั่งฉัน) · แชทที่ซ่อนอยู่ในหมวด "แชทที่ซ่อน" กดเลิกซ่อนได้ · มีข้อความใหม่ = กลับมาเอง
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChatBoxMenu } from "@/components/chat-manage";

const LN = "rgba(243,234,217,0.07)";
type B = { id: string; code: string; status: string; starts_at: string; hours: number; place: { label: string }; pt: { nick: string; img: string }; chat?: { hidden: boolean; mode: "hide" | "delete" } | null };
const OPEN = ["requested", "accepted", "checked_in", "cancel_requested"];
const SUB: Record<string, string> = { requested: "รอเพื่อนตอบรับ", accepted: "ยืนยันนัดแล้ว", checked_in: "ระหว่างนัด", cancel_requested: "ขอยกเลิก · รอทีมงาน", completed: "จบนัดแล้ว · อ่านอย่างเดียว", disputed: "แจ้งปัญหา · รอทีมงาน", refunded: "คืนเงินแล้ว", declined: "เพื่อนไม่สะดวก", expired: "หมดเวลาตอบรับ", cancelled: "ยกเลิกแล้ว" };
// ห้องที่ปิดแล้ว (จบ/ยกเลิก/ข้อพิพาท) ยังเปิดอ่านย้อนหลังได้ — แสดงแยกด้านล่าง 30 วันล่าสุด
const PAST_MS = 30 * 86400_000;

export default function ChatsPage() {
  const [rows, setRows] = useState<B[] | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const load = useCallback(() => fetch("/api/bookings?chat=1", { cache: "no-store" }).then((r) => r.json()).then((d) => setRows(d?.ok ? d.bookings : [])).catch(() => setRows([])), []);
  useEffect(() => { load(); }, [load]);
  const shown = (rows ?? []).filter((b) => !b.chat?.hidden);
  // ลบกล่องแชทแล้ว (ยังไม่มีข้อความใหม่) = ไม่แสดงเลย · ซ่อนไว้ = อยู่ในหมวดแชทที่ซ่อน
  const hidden = (rows ?? []).filter((b) => b.chat?.hidden && b.chat.mode === "hide").sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));
  const open = shown.filter((b) => OPEN.includes(b.status)).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const past = shown.filter((b) => !OPEN.includes(b.status) && Date.now() - Date.parse(b.starts_at) < PAST_MS).sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));
  const row = (b: B, isHidden = false) => (
    <div key={b.id} className="flex items-center gap-1 rounded-2xl bg-[#211a18]" style={{ border: `1px solid ${LN}`, opacity: isHidden ? 0.8 : 1 }}>
      <Link href={`/chat/${b.id}`} className="flex-1 min-w-0 flex gap-3 items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ padding: "12px 0 12px 12px" }}>
        <img src={b.pt.img} alt="" className="w-[52px] h-[52px] rounded-full object-cover shrink-0" />
        <span className="flex-1 min-w-0"><b className="font-medium text-[15px] block truncate">{b.pt.nick}</b><span className="block text-[12.5px] font-light text-[#d9c9b4] truncate">{SUB[b.status] ?? b.status} · {b.place.label} {b.hours} ชม. · {new Date(b.starts_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></span>
      </Link>
      <ChatBoxMenu bookingId={b.id} status={b.status} hidden={isHidden} onDone={load} className="w-11 h-11 mr-1 shrink-0 rounded-full grid place-items-center text-[#d9c9b4] hover:text-[#f3ead9]" />
    </div>
  );
  return (
    <div className="pb-6">
      <div style={{ padding: "18px 16px 12px" }}><h1 className="m-0 font-semibold text-[28px]">แชท</h1></div>
      <div className="flex flex-col gap-2" style={{ padding: "0 16px" }}>
        {rows === null ? <p className="m-0 text-[13px] font-light text-[#b5a596]">กำลังโหลด…</p> : !open.length && !past.length ? (
          <div className="rounded-[20px] bg-[#211a18] flex flex-col items-center gap-3 text-center" style={{ padding: 28, border: `1px solid ${LN}` }}>
            <span className="text-[14px] text-[#d9c9b4]">{hidden.length ? "ไม่มีแชทในรายการ · แชทที่ซ่อนไว้อยู่ด้านล่าง" : "ยังไม่มีห้องแชท · ห้องแชทเปิดเมื่อคุณส่งคำขอนัดเพื่อน"}</span>
            <Link href="/" className="h-11 px-5 rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">เลือกเพื่อน</Link>
          </div>
        ) : [...open, ...past].map((b, i) => (<div key={b.id}>{i === open.length && <p className="m-0 mt-3 mb-1.5 text-[13px] text-[#b5a596]">แชทที่ปิดแล้ว (อ่านย้อนหลัง)</p>}{row(b)}</div>))}
        {!!hidden.length && (
          <>
            <button type="button" onClick={() => setShowHidden((x) => !x)} aria-expanded={showHidden} className="mt-3 min-h-11 self-start rounded-full px-4 text-[13.5px] text-[#e8c472]" style={{ border: "1px solid rgba(232,196,114,.35)" }}>
              แชทที่ซ่อน ({hidden.length}) {showHidden ? "▴" : "▾"}
            </button>
            {showHidden && hidden.map((b) => row(b, true))}
          </>
        )}
      </div>
    </div>
  );
}
