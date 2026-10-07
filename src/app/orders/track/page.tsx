import { Suspense } from "react";
import { MarketHeader } from "../../products/market-ui";
import { MarketFooter } from "../../products/market-bits";
import { TrackView } from "./track-view";

export const metadata = { title: "ติดตามคำสั่งซื้อ · Mister Bamrungsuk" };

// สาธารณะ (ไม่ต้องล็อกอิน) — ลิงก์ลงลายเซ็นหลังสั่งซื้อ/ใน SMS หรือ เลขคำสั่งซื้อ + เบอร์ที่ยืนยัน OTP
export default function TrackPage() {
  return (
    <main className="min-h-dvh bg-ink-900 text-ink-100">
      <MarketHeader />
      <Suspense><TrackView /></Suspense>
      <MarketFooter />
    </main>
  );
}
