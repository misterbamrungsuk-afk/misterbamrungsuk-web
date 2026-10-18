"use client";
/* eslint-disable @next/next/no-img-element */

// บอร์ด C-Orders "นัดของฉัน" — แท็บ กำลังจะถึง / เสร็จแล้ว / ยกเลิก · เส้นสถานะ 5 ขั้น · ข้อมูลจริงจาก /api/bookings
import { useEffect, useState } from "react";
import Link from "next/link";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US");
type B = { id: string; code: string; status: string; starts_at: string; hours: number; total_satang: number; place: { label: string; detail: string }; decline_reason: string | null; pt: { pid: string; nick: string; img: string } };
const UP = ["requested", "accepted", "checked_in", "cancel_requested", "disputed"];
const DONE = ["completed"];
const STEPS = ["ส่งคำขอ", "ยืนยันแล้ว", "ถึงจุดนัด", "ระหว่างนัด", "เสร็จสิ้น"];
const stepOf = (s: string) => (s === "requested" ? 0 : s === "accepted" || s === "cancel_requested" ? 1 : s === "checked_in" ? 3 : s === "completed" ? 4 : 0);
const LABEL: Record<string, [string, string]> = {
  requested: ["รอเพื่อนตอบรับ", GOLD], accepted: ["ยืนยันแล้ว", "#5EDB98"], checked_in: ["ระหว่างนัด", "#5EDB98"], cancel_requested: ["ขอยกเลิก · รอทีมงาน", "#e3a35c"], disputed: ["แจ้งปัญหา · รอทีมงาน", "#e3a35c"],
  completed: ["เสร็จสิ้น", "#5EDB98"], declined: ["เพื่อนไม่สะดวก · คืนเงินแล้ว", "#d9c9b4"], expired: ["หมดเวลาตอบรับ · คืนเงินแล้ว", "#d9c9b4"], cancelled: ["ยกเลิก · คืนเงินแล้ว", "#d9c9b4"], refunded: ["คืนเงินแล้ว", "#d9c9b4"],
};
const when = (iso: string) => {
  const d = new Date(iso), today = new Date();
  const same = d.toDateString() === today.toDateString();
  return (same ? "วันนี้ " : d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" }) + " ") + d.toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
};

export default function OrdersPage() {
  const [tab, setTab] = useState<"up" | "done" | "cancel">("up");
  const [rows, setRows] = useState<B[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch("/api/bookings", { cache: "no-store" }).then((r) => r.json()).then((d) => (d?.ok ? setRows(d.bookings) : (setErr(d?.error || "โหลดไม่สำเร็จ"), setRows([])))).catch(() => { setErr("โหลดไม่สำเร็จ"); setRows([]); });
  }, []);
  const list = (rows ?? []).filter((b) => (tab === "up" ? UP.includes(b.status) : tab === "done" ? DONE.includes(b.status) : !UP.includes(b.status) && !DONE.includes(b.status)));

  return (
    <div className="pb-6">
      <div className="flex flex-col gap-[14px]" style={{ padding: "18px 16px 12px" }}>
        <div className="flex items-center justify-between gap-3"><h1 className="m-0 font-semibold text-[28px]">นัดของฉัน</h1><Link href="/stays/bookings" className="text-[13.5px] text-[#e8c472] hover:text-[#e8c472]">การจองห้องพัก ›</Link></div>
        <div className="flex gap-2">
          {([["up", "กำลังจะถึง"], ["done", "เสร็จแล้ว"], ["cancel", "ยกเลิก"]] as const).map(([id, l]) => (
            <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id} className="h-10 px-4 rounded-full text-[13.5px]" style={{ border: `1px solid ${tab === id ? "#f3ead9" : LN}`, background: tab === id ? "#f3ead9" : "transparent", color: tab === id ? "#171211" : "#f3ead9" }}>{l}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3" style={{ padding: "0 16px" }}>
        {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
        {rows === null ? <p className="m-0 text-[13px] font-light text-[#b5a596]">กำลังโหลด…</p> : !list.length ? (
          <div className="rounded-[20px] bg-[#211a18] flex flex-col items-center gap-3 text-center" style={{ padding: 28, border: `1px solid ${LN}` }}>
            <span className="text-[14px] text-[#d9c9b4]">{tab === "up" ? "ยังไม่มีนัดที่กำลังจะถึง" : tab === "done" ? "ยังไม่มีนัดที่เสร็จแล้ว" : "ไม่มีนัดที่ยกเลิก"}</span>
            {tab === "up" && <Link href="/" className="h-11 px-5 rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">เลือกเพื่อน</Link>}
          </div>
        ) : list.map((b) => {
          const st = stepOf(b.status);
          const lab = LABEL[b.status] ?? [b.status, "#d9c9b4"];
          return (
            <Link key={b.id} href={`/order/${b.id}`} className="rounded-[20px] bg-[#211a18] flex flex-col gap-[14px] text-[#f3ead9] hover:text-[#f3ead9]" style={{ padding: 14, border: `1px solid ${LN}`, opacity: tab === "cancel" ? 0.85 : 1 }}>
              <div className="flex gap-3 items-center">
                <img src={b.pt.img} alt="" className="w-14 h-14 rounded-[14px] object-cover shrink-0" style={{ filter: tab === "cancel" ? "grayscale(.6)" : "none" }} />
                <div className="flex-1 min-w-0"><b className="font-medium text-[16px]">{b.pt.nick} · {b.place.label} {b.hours} ชม.</b><div className="text-[13px] font-light text-[#d9c9b4]">{when(b.starts_at)} · #{b.code}</div></div>
                <b className="font-semibold text-[18px] shrink-0" style={{ color: GOLD }}>{baht(b.total_satang)}</b>
              </div>
              {tab === "up" && b.status !== "cancel_requested" && b.status !== "disputed" ? (
                <div className="grid grid-cols-5 gap-1 text-center text-[12px] text-[#d9c9b4]">
                  {STEPS.map((l, i) => (
                    <div key={l} style={{ color: i === st ? "#f3ead9" : undefined }}>
                      <span className="w-6 h-6 rounded-full mx-auto mb-1 grid place-items-center text-[12px] font-semibold" style={i < st ? { background: "#f3ead9", color: "#171211" } : i === st ? { background: GOLD, color: "#1b130b" } : { border: `1px solid ${LN}` }}>{i < st ? "✓" : i + 1}</span>{l}
                    </div>
                  ))}
                </div>
              ) : <span className="self-start h-6 px-[9px] rounded-full text-[12px] font-light flex items-center" style={{ border: `1px solid ${lab[1] === "#d9c9b4" ? LN : lab[1]}`, color: lab[1] }}>{lab[0]}</span>}
              {b.status === "requested" && <div className="rounded-xl bg-[#251d1b] text-[13px] font-light" style={{ padding: 12 }}>กันเงินไว้ในกระเป๋า · ถ้าเพื่อนไม่ตอบใน 30 นาที คืนเงินอัตโนมัติ</div>}
            </Link>
          );
        })}
        {tab === "up" && !!list.length && <div className="text-[12px] font-light text-[#d9c9b4] leading-[1.6]">ยกเลิกได้ฟรีก่อนเพื่อนตอบรับ · หลังยืนยันแล้ว ทีมงานพิจารณาตามกติกาการยกเลิก</div>}
      </div>
    </div>
  );
}
