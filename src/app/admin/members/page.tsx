import { listMembers } from "@/lib/customer/admin";
import { allBalances } from "@/lib/wallet";
import { listAll } from "@/lib/bookings";
import { listReports } from "@/lib/reports";
import { PageHead } from "../admin-nav";
import { MembersClient, type Row } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "สมาชิกลูกค้า — แอดมิน" };

// บอร์ด A-Members (ฝั่งลูกค้า): รายชื่อ · จำนวนนัด · เงินในกระเป๋า · ถูกรายงาน · ระงับ/คืนสิทธิ์ · คำขอลบข้อมูล (PDPA)
// Part-Time ดูที่ "ผู้สมัคร" (KYC · ใบเตือน · เปิดแสดง)
export default async function MembersPage() {
  const [members, bal, bookings, reports] = await Promise.all([listMembers().catch(() => []), allBalances().catch(() => []), listAll(5000).catch(() => []), listReports().catch(() => [])]);
  const rows: Row[] = members.map((m) => {
    const mine = bookings.filter((b) => b.customer_id === m.id);
    const money = bal.filter((r) => r.owner_type === "customer" && r.owner_id === m.id);
    return {
      ...m,
      bookings: mine.length, done: mine.filter((b) => b.status === "completed").length,
      open: mine.filter((b) => ["requested", "accepted", "checked_in", "cancel_requested", "disputed"].includes(b.status)).length,
      available: money.filter((r) => r.bucket === "available").reduce((s, r) => s + r.balance, 0),
      held: money.filter((r) => r.bucket === "held").reduce((s, r) => s + r.balance, 0),
      reported: reports.filter((r) => r.reporter_id === m.id).length,
    };
  });
  const pending = rows.filter((r) => r.delete_requested_at && !r.deleted_at).length;
  return (
    <>
      <PageHead title="สมาชิกลูกค้า" sub={`${rows.length} บัญชี · ขอลบข้อมูลรอดำเนินการ ${pending} · Part-Time ดูที่เมนู "ผู้สมัคร"`} />
      <MembersClient rows={rows} />
    </>
  );
}
