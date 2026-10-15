"use client";

// สัญญาและข้อตกลง — ถอดตามบอร์ด P-Contract (หัวหน้าย่อย + กล่องสัญญาเลื่อนอ่าน + ติ๊ก 3 ข้อ + ปุ่มติดล่าง)
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ITEMS = ["ฉันอ่านและยอมรับสัญญาความร่วมมือ", "ฉันยอมรับกฎความปลอดภัย การเช็กอิน และ SOS", "ฉันยินยอมให้เก็บและใช้ข้อมูลตาม PDPA"];
const CLAUSES = [
  "ผู้ให้บริการเป็นผู้รับจ้างอิสระ ไม่ใช่ลูกจ้าง",
  "ให้บริการเพื่อนกินเที่ยวตามกิจกรรมที่ลูกค้าเลือก ภายในเวลาที่ตกลง",
  "รับเงินผ่านแอปเท่านั้น ห้ามรับเงินหรือนัดนอกแอป",
  "ต้องเช็กอินด้วย GPS ทุกนัด และเปิด SOS ได้ตลอดเวลา",
  "ส่วนแบ่งรายได้และวันโอนเป็นไปตามประกาศในแอป",
  "ผิดกฎรับใบเตือน · ครบ 3 ใบระงับบัญชี",
  "ค่าการันตีคืนตามเงื่อนไขเมื่อครบ 1 ปี [รอกำหนดรายละเอียด]",
  "ข้อมูลส่วนบุคคลเก็บตาม PDPA",
  "ยินยอมให้บริษัทตรวจสอบประวัติอาชญากรรมก่อนเปิดบัญชีรับงาน",
];

export function ContractForm({ mb, t, accepted }: { mb: string; t: string; accepted: boolean }) {
  const router = useRouter();
  const [a, setA] = useState([accepted, accepted, accepted]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const all = a.every(Boolean);
  const q = t ? `?t=${encodeURIComponent(t)}` : "";

  const submit = async () => {
    if (!all) return setErr("ติ๊กยอมรับให้ครบทั้ง 3 ข้อ");
    setBusy(true); setErr("");
    const res = await fetch("/api/join/contract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t }) }).catch(() => null);
    if (res?.ok) return router.push(`/join/done/${mb}${q}`);
    setErr("บันทึกไม่สำเร็จ กรุณาลองใหม่"); setBusy(false);
  };

  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9", fontSize: 15, lineHeight: 1.6 }}>
      <header className="bg-[#251d1b]">
        <div className="mx-auto max-w-[720px] flex items-center gap-3" style={{ padding: "12px 16px", height: 68 }}>
          <Link href={`/join/bank/${mb}${q}`} aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full bg-[#211a18] text-[#f3ead9] grid place-items-center shrink-0 hover:text-[#f3ead9]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <h1 className="m-0 flex-1 font-semibold text-[18px]">สัญญาและข้อตกลง</h1>
        </div>
      </header>
      <main className="mb-panel mx-auto max-w-[720px] flex flex-col gap-4" style={{ padding: "20px 16px 160px" }}>
        <p className="m-0 text-[13px] font-light text-[#d9c9b4] leading-[1.6]">อ่านแล้วติ๊กยอมรับทั้ง 3 ข้อ</p>
        <div className="rounded-2xl bg-[#211a18] text-[13px] font-light text-[#d9c9b4] overflow-y-auto" style={{ padding: 16, height: 260, lineHeight: 1.75 }} tabIndex={0} aria-label="สัญญาความร่วมมือ">
          <b className="font-semibold text-[#f3ead9]">สัญญาความร่วมมือ Part Time (v1.0)</b>
          {CLAUSES.map((c, i) => <div key={c}>{i + 1}. {c}</div>)}
        </div>
        {ITEMS.map((txt, i) => (
          <button key={txt} type="button" role="checkbox" aria-checked={a[i]} onClick={() => setA((x) => x.map((v, j) => (j === i ? !v : v)))} className="flex gap-3 items-start text-left rounded-2xl bg-[#211a18] text-[#f3ead9]" style={{ padding: 16 }}>
            <span className="shrink-0 grid place-items-center rounded-md text-[#1b130b]" style={{ width: 22, height: 22, background: a[i] ? "#e8c472" : "#251d1b" }}>{a[i] ? "✓" : ""}</span>
            <span className="text-[13px] font-light leading-[1.6]">{txt}</span>
          </button>
        ))}
        {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
      </main>
      <div className="fixed inset-x-0 bottom-0 z-40" style={{ padding: "12px 16px calc(28px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(23,18,17,0), #171211 30%)" }}>
        <div className="mx-auto max-w-[688px]">
          <button type="button" onClick={submit} disabled={busy} className="w-full min-h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold text-[15px]" style={{ opacity: all && !busy ? 1 : 0.45 }}>{busy ? "กำลังส่ง…" : "ยอมรับและส่งใบสมัคร"}</button>
        </div>
      </div>
    </div>
  );
}
