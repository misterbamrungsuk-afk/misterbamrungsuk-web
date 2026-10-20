import Link from "next/link";
import { BrandHeader } from "@/components/mb/ui";

export const metadata = { title: "เปิดให้บริการเร็ว ๆ นี้ — Mister Bamrungsuk", robots: { index: false } };

// โหมดรับสมัคร Part-Time อย่างเดียว (src/lib/site-gate.ts PT_ONLY): หน้าลูกค้า/ตลาด/สปา/พาร์ทเนอร์ ถูก rewrite มาที่นี่
export default function SoonPage() {
  return (
    <div className="mb-v7 min-h-dvh flex flex-col" style={{ background: "#171211", color: "#f3ead9" }}>
      <BrandHeader tone="bar" small />
      <main className="flex-1 grid place-items-center px-4 py-12">
        <div className="w-full max-w-[440px] flex flex-col items-center gap-4 text-center">
          <div className="text-[12px] tracking-[2.5px] text-[#e8c472] font-light">COMING SOON</div>
          <h1 className="m-0 font-semibold text-[26px] leading-[1.35]" style={{ textWrap: "balance" }}>เปิดให้บริการเร็ว ๆ นี้</h1>
          <p className="m-0 text-[15px] leading-[1.7] font-light text-[#d9c9b4]">ตอนนี้เปิดรับสมัคร Part-Time เพื่อนกินเที่ยว Mister Bamrungsuk · หน้าจองและบริการอื่นจะเปิดเร็ว ๆ นี้</p>
          <Link href="/join" className="w-full min-h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold text-[15px] grid place-items-center hover:text-[#1b130b]">สมัคร Part-Time</Link>
          <Link href="/join/me" className="w-full min-h-[52px] rounded-[14px] text-[#e8c472] font-semibold text-[15px] grid place-items-center hover:text-[#e8c472]" style={{ boxShadow: "inset 0 0 0 1px rgba(232,196,114,.45)" }}>Part-Time เข้าสู่ระบบ</Link>
          <Link href="/" className="min-h-11 inline-flex items-center text-[14px] text-[#d9c9b4] underline underline-offset-2">กลับหน้าแรก</Link>
        </div>
      </main>
    </div>
  );
}
