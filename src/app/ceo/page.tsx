import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { ceoPasswordSet, ceoSession } from "@/lib/ceo-room-auth";
import { todayBkk } from "@/lib/bookings/payroll";
import { loadCeoRoom } from "@/lib/admin/ceo-room";
import { CeoRoom } from "../admin/payroll/room";
import { CeoBar, CeoGate } from "./client";

// ห้อง CEO ลิงก์แยก (บอส 28 ต.ค. 2569): /ceo + รหัส CEO (แยกจากรหัสแอดมิน)
// ยังไม่ตั้งรหัส → บัญชีแอดมิน CEO ตั้งได้ที่นี่ครั้งเดียว · ตั้งแล้ว → ใส่รหัส CEO เข้าห้อง · การอนุมัติเงินทุกอย่างทำได้ที่นี่เท่านั้น
export default async function CeoPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const [set, ceo] = await Promise.all([ceoPasswordSet(), ceoSession()]);
  if (!ceo) {
    const admin = set ? null : await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
    return <CeoGate mode={set ? "login" : admin?.role === "ceo" ? "setup" : "unset"} />;
  }
  const { d } = await searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(d ?? "") ? d! : todayBkk();
  return (
    <>
      <CeoBar />
      <CeoRoom x={await loadCeoRoom(day)} day={day} isCeo base="/ceo" />
    </>
  );
}
