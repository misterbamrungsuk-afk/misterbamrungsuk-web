import { redirect } from "next/navigation";
import { getEarnings } from "@/lib/join/earnings-settings";
import { EarningsCalc } from "./calc";

export const dynamic = "force-dynamic";
export const metadata = { title: "รายได้และส่วนแบ่ง Part-Time — Mister Bamrungsuk" };

// หน้า "รายได้และส่วนแบ่ง" (บอร์ด JoinEarnings) · ตัวเลขจากแอดมิน "ราคาและส่วนแบ่ง" · ปิดหน้านี้ได้จากแอดมิน
export default async function EarningsPage() {
  const { history: _h, ...cfg } = await getEarnings(); // eslint-disable-line @typescript-eslint/no-unused-vars
  if (!cfg.show) redirect("/join");
  return <EarningsCalc cfg={cfg} />;
}
