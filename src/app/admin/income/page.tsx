import { listIncome } from "@/lib/admin/income";
import { PageHead } from "../admin-nav";
import { IncomeBoard } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "ยอดเงินเข้า · แอดมิน Mister Bamrungsuk" };

// ยอดเงินเข้า — ใครโอนมา · จากระบบไหน · เข้าแล้ว/รอตรวจ (Part-Time · Partner · Collab · Marketplace · ลูกค้า)
export default async function IncomePage() {
  const rows = await listIncome();
  return (
    <>
      <PageHead title="ยอดเงินเข้า" sub="ทุกยอดที่โอนเข้าบริษัท แยกตามระบบ · ใครโอน · สถานะ" />
      <IncomeBoard rows={rows} />
    </>
  );
}
