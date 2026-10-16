"use client";

// บอร์ด C-DeleteAccount "ลบบัญชี" (PDPA) — แจ้งผล · มีนัดค้าง = ลบไม่ได้ · ส่งคำขอให้ทีมงานลบภายใน 30 วัน
import { useState } from "react";
import Link from "next/link";

const GOLD = "#e8c472";

export default function DeleteAccountPage() {
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ done?: boolean; err?: string; open?: number } | null>(null);
  const send = async () => {
    if (!ok) return;
    setBusy(true);
    const r = await fetch("/api/me/delete", { method: "POST" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    setRes(d?.ok ? { done: true } : { err: d?.error || "ส่งคำขอไม่สำเร็จ", open: d?.open });
  };
  return (
    <div className="min-h-dvh pb-[160px]">
      <header className="flex items-center gap-3 h-[68px] px-4" style={{ background: "#251d1b" }}>
        <Link href="/profile" aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full bg-[#211a18] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
        <h1 className="m-0 flex-1 font-semibold text-[18px]">ลบบัญชี</h1>
      </header>
      <main className="flex flex-col gap-4" style={{ padding: "20px 16px 0" }}>
        <div className="text-[#ff8a9a]"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg></div>
        <h2 className="m-0 font-semibold text-[22px]">ลบบัญชีถาวร</h2>
        <div className="rounded-2xl bg-[#211a18] flex flex-col gap-[10px]" style={{ padding: 16 }}>
          <div className="font-semibold">สิ่งที่จะเกิดขึ้น</div>
          <ul className="m-0 text-[13px] font-light text-[#d9c9b4] leading-[1.6]" style={{ paddingLeft: 18 }}>
            <li>ลบโปรไฟล์ ที่อยู่ และรายการที่ถูกใจ</li><li>แชทและประวัติการจองจะถูกลบภายใน 30 วัน</li><li>ใบเสร็จและรายการเงินเก็บไว้ 5 ปีตามกฎหมายภาษี</li><li>ยอดคงเหลือในกระเป๋า: ทีมงานติดต่อโอนคืนก่อนลบ</li>
          </ul>
        </div>
        {res?.err && <div className="rounded-2xl" style={{ padding: 16, background: "rgba(201,40,61,.16)" }}><div className="font-semibold text-[#ff8a9a]">{res.open ? "ยังลบไม่ได้ถ้ามีนัดที่ยังไม่จบ" : "ส่งคำขอไม่สำเร็จ"}</div><div className="text-[13px] font-light text-[#d9c9b4]">{res.err}{res.open ? <> · <Link href="/orders" style={{ color: GOLD }}>ไปที่การจองของฉัน</Link></> : null}</div></div>}
        {res?.done && <div className="rounded-2xl text-[13px] text-[#7fd6a3]" style={{ padding: 16, background: "rgba(60,170,110,.12)" }}>ส่งคำขอลบบัญชีแล้ว · ทีมงานจะยืนยันและลบข้อมูลภายใน 30 วัน</div>}
        {!res?.done && <button type="button" onClick={() => setOk(!ok)} aria-pressed={ok} className="flex items-center gap-3 rounded-2xl bg-[#211a18] text-left text-[#f3ead9]" style={{ padding: 16 }}>
          <span className="w-[22px] h-[22px] rounded-md grid place-items-center text-[#1b130b]" style={{ background: ok ? GOLD : "#251d1b" }}>{ok ? "✓" : ""}</span>ฉันเข้าใจและต้องการลบบัญชี
        </button>}
      </main>
      {!res?.done && <div className="fixed left-0 right-0 bottom-0 mx-auto max-w-[480px] flex flex-col gap-2 z-40" style={{ padding: "12px 16px calc(16px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(23,18,17,0), #171211 30%)" }}>
        <button type="button" onClick={send} disabled={!ok || busy} className="min-h-[52px] rounded-[14px] font-semibold text-[15px] text-[#ff8a9a] disabled:opacity-45" style={{ background: "rgba(201,40,61,.16)" }}>{busy ? "กำลังส่งคำขอ…" : "ส่งคำขอลบบัญชี"}</button>
        <Link href="/profile" className="min-h-11 grid place-items-center text-[14px] text-[#d9c9b4]">ยกเลิก</Link>
      </div>}
    </div>
  );
}
