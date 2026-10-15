import { getEarnings } from "@/lib/join/earnings-settings";
import { EarningsAdmin } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "ราคาและส่วนแบ่ง · แอดมิน Mister Bamrungsuk" };

// บอร์ด A-Earnings — ตัวเลขที่ผู้สมัครเห็นในหน้า "รายได้และส่วนแบ่ง" และราคาบนการ์ดโปรไฟล์
export default async function EarningsAdminPage() {
  return <EarningsAdmin initial={await getEarnings()} />;
}
