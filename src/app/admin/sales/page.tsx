import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { listPayouts, listPurchases, listReps } from "@/lib/member/store";
import { getMemberSettings } from "@/lib/member/tiers";
import { PageHead } from "../admin-nav";
import { SalesAdmin } from "./client";
import { extraOf, listApplicants } from "@/lib/join/store";
import { RECRUIT_BONUS, loginUsernames, recruitBonusCount } from "@/lib/member/recruit";

export const dynamic = "force-dynamic";
export const metadata = { title: "เมมเบอร์ · Recruit — แอดมิน" };

// เปิดเมม Gold/Black: สลิปรอตรวจ · Recruit (สร้าง/ลิงก์/ปิด) · โอนค่าคอมที่ CEO อนุมัติแล้ว · ตั้งค่าระดับ (CEO เท่านั้น)
export default async function SalesAdminPage() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  const [purchases, reps, payouts, cfg, apps, logins] = await Promise.all([listPurchases().catch(() => []), listReps().catch(() => []), listPayouts().catch(() => []), getMemberSettings(), listApplicants().catch(() => []), loginUsernames().catch(() => ({} as Record<string, string>))]);
  // หมอที่ Recruit แต่ละคนชวน (ผูกตอนสมัครผ่าน /join/s/<โค้ด>)
  const recruits = apps.map((a) => ({ a, x: extraOf(a) })).filter(({ x }) => x.sales_ref);
  const repStats = reps.map((r) => {
    const mine = purchases.filter((p) => p.ref_code === r.code);
    const rc = recruits.filter(({ x }) => x.sales_ref?.rep_id === r.id);
    return { ...r, count: mine.filter((p) => p.status === "credited").length, earned: mine.filter((p) => p.status === "credited").reduce((t, p) => t + p.commission_satang, 0) + rc.reduce((t, { x }) => t + (x.recruit_at ? x.recruit_satang ?? 0 : 0), 0) + recruitBonusCount(rc.filter(({ x }) => x.recruit_at).length) * RECRUIT_BONUS.satang, recruits: rc.length, recruitsPaid: rc.filter(({ a }) => a.status === "verified").length, username: logins[r.id] ?? null };
  });
  const members = purchases.filter((p) => p.status === "credited");
  return (
    <>
      <PageHead title="เมมเบอร์ · Recruit" sub={`เมมเบอร์ ${members.length} รายการ · ยอดเปิดเมม ฿${(members.reduce((t, p) => t + p.pay_satang, 0) / 100).toLocaleString("th-TH")} · ค่าการตลาด (โบนัส+คอม) ฿${(members.reduce((t, p) => t + p.bonus_satang + p.commission_satang, 0) / 100).toLocaleString("th-TH")} · ${cfg.enabled ? "เปิดขายอยู่" : "ปิดขาย"}`} />
      <SalesAdmin isCeo={s?.role === "ceo"} cfg={cfg} purchases={purchases} reps={repStats} payouts={payouts} />
    </>
  );
}
