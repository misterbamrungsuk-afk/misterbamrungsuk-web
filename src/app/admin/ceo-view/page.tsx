import { todayBkk } from "@/lib/bookings/payroll";
import { loadCeoRoom } from "@/lib/admin/ceo-room";
import { CeoRoom } from "../payroll/room";

export const dynamic = "force-dynamic";
export const metadata = { title: "ห้อง CEO · ดูอย่างเดียว — แอดมิน" };

// แอดมินดูห้อง CEO ได้ (บอส 28 ต.ค. 2569) — ข้อมูลชุดเดียวกับ /admin/payroll แต่ไม่มีปุ่มอนุมัติ · API ปฏิเสธที่ไม่ใช่ CEO อยู่แล้ว
export default async function CeoViewPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(d ?? "") ? d! : todayBkk();
  return <CeoRoom x={await loadCeoRoom(day)} day={day} isCeo={false} base="/admin/ceo-view" />;
}
