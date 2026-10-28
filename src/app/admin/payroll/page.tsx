import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { todayBkk } from "@/lib/bookings/payroll";
import { loadCeoRoom } from "@/lib/admin/ceo-room";
import { CeoRoom } from "./room";

export const dynamic = "force-dynamic";
export const metadata = { title: "ห้อง CEO — แอดมิน" };

// ห้อง CEO (เข้าได้เฉพาะ CEO · บอส 28 ต.ค. 2569): เงินเข้าบริษัท · เงินแต่ละคน · อนุมัติเงินเข้ากระเป๋าทุกส่วน · อนุมัติคำขอถอน
// อนุมัติถอนแล้ว → แอดมินโอนที่หน้า "โอนเงินออก" · แอดมินอื่นดูข้อมูลชุดเดียวกันได้ที่ /admin/ceo-view (กดไม่ได้)
export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(d ?? "") ? d! : todayBkk();
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  const x = await loadCeoRoom(day);
  return <CeoRoom x={x} day={day} isCeo={s?.role === "ceo"} base="/admin/payroll" />;
}
