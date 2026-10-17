import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { listPayouts, listPurchases, listReps } from "@/lib/member/store";
import { getMemberSettings } from "@/lib/member/tiers";
import { PageHead } from "../admin-nav";
import { SalesAdmin } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "เมมเบอร์ · Sale Man — แอดมิน" };

// เปิดเมม Gold/Black: สลิปรอตรวจ · Sale Man (สร้าง/ลิงก์/ปิด) · โอนค่าคอมที่ CEO อนุมัติแล้ว · ตั้งค่าระดับ (CEO เท่านั้น)
export default async function SalesAdminPage() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  const [purchases, reps, payouts, cfg] = await Promise.all([listPurchases().catch(() => []), listReps().catch(() => []), listPayouts().catch(() => []), getMemberSettings()]);
  const repStats = reps.map((r) => {
    const mine = purchases.filter((p) => p.ref_code === r.code);
    return { ...r, count: mine.filter((p) => p.status === "credited").length, earned: mine.filter((p) => p.status === "credited").reduce((t, p) => t + p.commission_satang, 0) };
  });
  const members = purchases.filter((p) => p.status === "credited");
  return (
    <>
      <PageHead title="เมมเบอร์ · Sale Man" sub={`เมมเบอร์ ${members.length} รายการ · ยอดเปิดเมม ฿${(members.reduce((t, p) => t + p.pay_satang, 0) / 100).toLocaleString("th-TH")} · ค่าการตลาด (โบนัส+คอม) ฿${(members.reduce((t, p) => t + p.bonus_satang + p.commission_satang, 0) / 100).toLocaleString("th-TH")} · ${cfg.enabled ? "เปิดขายอยู่" : "ปิดขาย"}`} />
      <SalesAdmin isCeo={s?.role === "ceo"} cfg={cfg} purchases={purchases} reps={repStats} payouts={payouts} />
    </>
  );
}
