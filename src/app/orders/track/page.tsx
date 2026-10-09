import { Suspense } from "react";
import { MHeader, MShell } from "../../products/m-kit";
import { TrackView } from "./track-view";

export const metadata = { title: "ติดตามคำสั่งซื้อ · Mister Bamrungsuk" };

// สาธารณะ (ไม่ต้องล็อกอิน) — ลิงก์ลงลายเซ็นหลังสั่งซื้อ/ใน SMS หรือ เลขคำสั่งซื้อ + เบอร์ที่ยืนยัน OTP  (ตามบอร์ด OrderTrack)
export default function TrackPage() {
  return (
    <MShell>
      <MHeader back="/market" eyebrow="ORDER TRACKING" title="ติดตามคำสั่งซื้อ" cart={false} />
      <Suspense><TrackView /></Suspense>
    </MShell>
  );
}
