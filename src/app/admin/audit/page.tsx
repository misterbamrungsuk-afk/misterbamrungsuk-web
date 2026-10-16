import { listAdminNotices } from "@/lib/bookings";
import { PageHead } from "../admin-nav";
import { AlertsClient } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "SOS · แจ้งเตือนระบบ — แอดมิน" };

// แจ้งเตือนจริงของแอดมิน (ตาราง notifications user_type=admin): SOS · ยอดเงินไม่ตรง · สปาห้องเต็ม · ขอลบบัญชี (PDPA)
export default async function AlertsPage() {
  const items = await listAdminNotices(200).catch(() => []);
  return (
    <>
      <PageHead title="SOS · แจ้งเตือนระบบ" sub="SOS จากลูกค้า/Part-Time · ยอดเงินไม่ตรง · สปาแจ้งห้องเต็ม · ลูกค้าขอลบบัญชี — กด “รับเรื่องแล้ว” เมื่อจัดการ" />
      <AlertsClient initial={items} />
    </>
  );
}
