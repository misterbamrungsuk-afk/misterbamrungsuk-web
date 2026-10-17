"use client";

// บอร์ด C-Report "รายงาน" — เลือกเหตุผล · เล่าเหตุการณ์ · บล็อกผู้ใช้นี้ด้วย · ทีมงานตรวจภายใน 24 ชม. (ผู้ถูกรายงานไม่รู้ว่าใครรายงาน)
// เปิดจากห้องแชท/หน้านัด (?booking=) หรือหน้าโปรไฟล์ (?pid=) — ชื่อที่แสดงมาจากเซิร์ฟเวอร์ (page.tsx) ไม่เชื่อ ?nick=
import { canGoBack } from "@/components/smart-back";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const GOLD = "#e8c472";
const REASONS = ["ไม่มาตามนัด / มาสาย", "พูดหรือทำไม่สุภาพ", "ขอติดต่อ / จ่ายเงินนอกแอป", "ทำให้รู้สึกไม่ปลอดภัย", "ข้อมูลโปรไฟล์ไม่ตรง", "อื่นๆ"];

export function ReportForm({ booking, pid, nick }: { booking: string | null; pid: string | null; nick: string }) {
  const router = useRouter();
  const [r, setR] = useState(-1);
  const [detail, setDetail] = useState("");
  const [block, setBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState("");
  const send = async () => {
    if (r < 0) return setErr("เลือกเหตุผลก่อนส่ง");
    setBusy(true); setErr("");
    const res = await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ booking_id: booking, pid, reason: REASONS[r], detail, block }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(false);
    if (d?.ok) setSent(d.code); else setErr(d?.error || "ส่งรายงานไม่สำเร็จ");
  };
  return (
    <div className="min-h-dvh" style={{ background: "#171211" }}>
      <header className="flex items-center gap-3 h-[68px] px-4" style={{ background: "#251d1b" }}>
        <button type="button" onClick={() => (canGoBack() ? router.back() : router.push("/"))} aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full bg-[#211a18] grid place-items-center text-[#f3ead9] shrink-0"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></button>
        <h1 className="m-0 flex-1 font-semibold text-[18px]">รายงาน{nick ? ` · ${nick}` : ""}</h1>
      </header>
      {/* เว้นล่างเท่าแถบปุ่มลอย (ปุ่มส่ง 52 + ลิงก์ SOS 44 + ระยะ) — inline padding เดิมเป็น 0 ทับ pb ทำให้สวิตช์บล็อกโดนปุ่มทับ */}
      <main className="flex flex-col gap-4" style={{ padding: "20px 16px calc(150px + env(safe-area-inset-bottom))" }}>
        <p className="m-0 text-[13px] font-light text-[#d9c9b4]">ทีมงานตรวจภายใน 24 ชม. · ผู้ถูกรายงานจะไม่รู้ว่าใครรายงาน{booking ? " · ทีมงานดูแชทของนัดนี้ประกอบ" : ""}</p>
        <div role="radiogroup" aria-label="เหตุผล" className="flex flex-col gap-2">
          {REASONS.map((t, i) => (
            <button key={t} type="button" role="radio" aria-checked={r === i} onClick={() => { setR(i); setErr(""); }} className="flex gap-3 items-center text-left rounded-2xl bg-[#211a18] text-[#f3ead9] text-[15px]" style={{ padding: 14, boxShadow: `inset 0 0 0 1.5px ${r === i ? GOLD : "transparent"}` }}>
              <span className="w-5 h-5 rounded-full grid place-items-center shrink-0" style={{ boxShadow: `inset 0 0 0 2px ${r === i ? GOLD : "#b5a596"}` }}><span className="w-2.5 h-2.5 rounded-full" style={{ background: r === i ? GOLD : "transparent" }} /></span>{t}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1.5"><span className="text-[13px] font-light text-[#d9c9b4]">รายละเอียด</span>
          <textarea value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={1000} rows={4} placeholder="เล่าเหตุการณ์สั้นๆ" className="rounded-xl bg-[#251d1b] p-[14px] text-[16px] text-[#f3ead9] outline-none placeholder:text-[#b5a596] resize-none" />
        </label>
        <button type="button" role="switch" aria-checked={block} onClick={() => setBlock(!block)} className="flex justify-between items-center gap-3 rounded-2xl bg-[#211a18] text-left text-[#f3ead9]" style={{ padding: 16 }}>
          <span>บล็อกผู้ใช้นี้ด้วย<span className="block text-[12px] font-light text-[#b5a596]">จะไม่เห็นกันในหน้าแรก ค้นหา และจองไม่ได้</span></span>
          <span className="w-11 h-[26px] rounded-full relative shrink-0" style={{ background: block ? GOLD : "rgba(243,234,217,0.18)" }}><span className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all" style={{ left: block ? 21 : 3 }} /></span>
        </button>
        {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
        {sent && <div role="status" className="rounded-2xl text-[14px]" style={{ padding: 16, background: "rgba(29,159,77,.14)" }}>ส่งรายงานแล้ว · หมายเลข {sent} · ทีมงานจะติดต่อกลับทางการแจ้งเตือน</div>}
      </main>
      <div className="fixed left-0 right-0 bottom-0 mx-auto max-w-[480px] flex flex-col gap-2 z-40" style={{ padding: "12px 16px calc(28px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(23,18,17,0), #171211 30%)" }}>
        {sent ? <Link href="/" className="h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">กลับหน้าแรก</Link>
          : <button type="button" onClick={send} disabled={busy} className="h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold disabled:opacity-50">{busy ? "กำลังส่ง…" : "ส่งรายงาน"}</button>}
        <Link href="/sos" className="min-h-11 grid place-items-center text-[14px] text-[#ff8a9a] hover:text-[#ff8a9a]">อยู่ในอันตรายตอนนี้? กด SOS</Link>
      </div>
    </div>
  );
}
