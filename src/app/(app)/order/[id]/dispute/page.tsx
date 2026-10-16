"use client";

// บอร์ด C-Dispute "แจ้งปัญหาการนัด" — เลือกเรื่อง + เล่ารายละเอียด → เงินพักไว้จนทีมงานตัดสิน
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { lineAddUrl } from "@/lib/join/config";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US");
const L: [string, string][] = [["เพื่อนไม่มาตามนัด", "คืน 100% หลังตรวจหลักฐาน"], ["อยู่ไม่ครบเวลาที่นัด", ""], ["พฤติกรรมไม่เหมาะสม", ""], ["อื่นๆ", ""]];

export default function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [b, setB] = useState<{ code: string; total_satang: number; status: string } | null>(null);
  const [reason, setReason] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { fetch(`/api/bookings/${id}`, { cache: "no-store" }).then((r) => r.json()).then((d) => d?.ok && setB(d.booking)).catch(() => {}); }, [id]);
  const send = async () => {
    if (!text.trim()) return setErr("เล่ารายละเอียดสั้น ๆ ให้ทีมงานทราบ");
    setBusy(true); setErr("");
    const r = await fetch(`/api/bookings/${id}/dispute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: L[reason][0], text }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (d?.ok) return router.push(`/order/${id}`);
    setErr(d?.error || "ส่งไม่สำเร็จ");
  };
  return (
    <div className="min-h-dvh pb-[150px]" style={{ background: "#171211" }}>
      <div className="flex items-center gap-[10px]" style={{ padding: 16 }}>
        <Link href={`/order/${id}`} aria-label="ย้อนกลับ" className="w-[42px] h-[42px] rounded-full grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
        <h1 className="m-0 font-semibold text-[19px]">แจ้งปัญหาการนัด</h1>
        {b && <span className="ml-auto text-[12px] font-light text-[#d9c9b4]">#{b.code}</span>}
      </div>
      <div className="flex flex-col gap-4" style={{ padding: "0 16px" }}>
        {b && <div className="flex gap-[10px] items-center rounded-[14px] text-[13px] font-light" style={{ padding: "12px 14px", border: "1px solid rgba(232,196,114,0.55)" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg><span>เงิน <b style={{ color: GOLD }}>{baht(b.total_satang)}</b> พักไว้กับเราจนกว่าทีมงานจะตรวจสอบเสร็จ</span></div>}
        <div className="text-[16px] font-medium">เกิดอะไรขึ้น</div>
        <div className="flex flex-col gap-2" role="radiogroup">
          {L.map(([l, n], i) => (
            <button key={l} type="button" role="radio" aria-checked={reason === i} onClick={() => setReason(i)} className="flex items-center gap-3 rounded-[14px] bg-[#211a18] text-left text-[14px] text-[#f3ead9]" style={{ padding: "13px 14px", border: `1px solid ${reason === i ? GOLD : LN}` }}>
              <span className="w-5 h-5 rounded-full shrink-0" style={{ border: reason === i ? `6px solid ${GOLD}` : `1px solid ${LN}` }} />{l}<span className="ml-auto text-[12px] font-light" style={{ color: GOLD }}>{n}</span>
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1.5"><span className="text-[16px] font-medium">รายละเอียด</span>
          <textarea value={text} onChange={(e) => { setText(e.target.value); setErr(""); }} maxLength={1000} placeholder={reason === 0 ? "เช่น รอที่จุดนัด 30 นาที ติดต่อทางแชทแล้วไม่ตอบ" : "เล่ารายละเอียดสั้น ๆ"} className="h-[92px] rounded-[14px] bg-[#211a18] p-3 text-[16px] text-[#f3ead9] outline-none resize-none placeholder:text-[#b5a596]" style={{ border: `1px solid ${LN}` }} />
        </label>
        <div className="text-[12px] font-light text-[#d9c9b4] leading-[1.55]">ทีมงานจะตรวจข้อมูลแชท เวลาเช็กอิน และสอบถามทั้ง 2 ฝ่าย แล้วแจ้งผลภายใน 24 ชม. ระหว่างนี้เงินยังพักไว้กับเรา</div>
        {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
      </div>
      <div className="fixed left-0 right-0 bottom-0 mx-auto max-w-[480px] flex flex-col gap-[10px]" style={{ padding: "12px 16px calc(24px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(23,18,17,0), #171211 25%)" }}>
        <button type="button" disabled={busy} onClick={send} className="h-14 rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[17px] disabled:opacity-50">{busy ? "กำลังส่ง…" : "ส่งเรื่องให้ทีมงาน"}</button>
        <a href={lineAddUrl()} target="_blank" rel="noopener noreferrer" className="text-center text-[13px] font-light text-[#d9c9b4]">หรือติดต่อทีมงานทาง LINE</a>
      </div>
    </div>
  );
}
