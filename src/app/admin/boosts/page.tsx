import { listBoostCodes, listBoosts } from "@/lib/join/boost";
import { PageHead } from "../admin-nav";
import { BoostsClient } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "โปรโมทโปรไฟล์ — แอดมิน" };

// Part-Time จ่ายเงินโปรโมทตัวเอง (ขึ้นหน้าแนะนำ) — สลิปที่ Slip2Go ยืนยันไม่ได้รอตรวจที่นี่ · ดูรายการที่กำลังโปรโมท
export default async function BoostsPage() {
  const [list, codes] = await Promise.all([listBoosts(), listBoostCodes()]);
  return (
    <>
      <PageHead title="โปรโมทโปรไฟล์ Part-Time" sub="จ่ายจากกระเป๋า = เปิดทันที · โอน QR: Slip2Go ผ่าน = เปิดทันที ที่เหลือรอตรวจที่นี่" />
      <BoostsClient list={list} codes={codes} />
    </>
  );
}
