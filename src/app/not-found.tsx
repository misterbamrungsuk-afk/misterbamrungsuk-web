import Link from "next/link";
import { BrandBar } from "@/components/brand-bar";

export const metadata = { title: "ไม่พบหน้านี้ — Mister Bamrungsuk", robots: { index: false } };

// หน้า 404 ของแบรนด์ (แทนหน้าเริ่มต้นของ Next) — พากลับหน้าหลัก/หาเพื่อน/ร้านค้า
export default function NotFound() {
  return (
    <div className="mb-v7 min-h-dvh flex flex-col" style={{ background: "#171211", color: "#f3ead9" }}>
      <BrandBar />
      <main className="flex-1 grid place-items-center px-4 py-10">
        <div className="w-full max-w-[420px] rounded-[22px] text-center flex flex-col gap-3" style={{ padding: "28px 20px", background: "#211a18", border: "1px solid rgba(232,196,114,.35)" }}>
          <span className="text-[44px] font-bold text-[#e8c472] leading-none">404</span>
          <h1 className="m-0 text-[20px] font-semibold">ไม่พบหน้านี้</h1>
          <p className="m-0 text-[14.5px] text-[#d9c9b4] leading-[1.7]">ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้าย/ปิดไปแล้ว</p>
          <div className="grid gap-2 mt-1">
            <Link href="/" className="h-12 rounded-[14px] grid place-items-center font-semibold bg-[#e8c472] text-[#1b130b] hover:text-[#1b130b]">กลับหน้าแรก</Link>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/map" className="h-11 rounded-[14px] grid place-items-center text-[14px] text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: "1px solid rgba(243,234,217,.2)" }}>หาเพื่อนบนแผนที่</Link>
              <Link href="/market" className="h-11 rounded-[14px] grid place-items-center text-[14px] text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: "1px solid rgba(243,234,217,.2)" }}>ร้านค้า</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
