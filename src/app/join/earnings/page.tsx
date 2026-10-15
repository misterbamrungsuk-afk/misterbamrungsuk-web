import { redirect } from "next/navigation";
import { EARNINGS } from "@/lib/join/config";
import { EarningsCalc } from "./calc";

export const metadata = { title: "รายได้และส่วนแบ่ง Part-Time — Mister Bamrungsuk" };

// หน้า "รายได้และส่วนแบ่ง" (ตามบอร์ด JoinEarnings) · ปิดได้ที่ EARNINGS.show
export default function EarningsPage() {
  if (!EARNINGS.show) redirect("/join");
  return <EarningsCalc />;
}
