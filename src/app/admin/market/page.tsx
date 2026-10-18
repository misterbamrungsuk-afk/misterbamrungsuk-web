import { adminData } from "@/lib/market/admin-data";
import { PageHead } from "../admin-nav";
import { MarketAdmin } from "./market-admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketplace · แอดมิน Mister Bamrungsuk" };

// ร้านค้า (GP %) · สินค้า (เลข อย. บังคับก่อน publish) · ตรวจสลิปคำสั่งซื้อ · สรุป GP ต่อเดือน
export default async function MarketAdminPage() {
  const data = await adminData();
  return (
    <>
      <PageHead title="Marketplace สินค้า" sub="หลายร้าน · ร้านสมัครเองที่ /market/sell · จ่าย QR + สลิป หรือกระเป๋าเงิน · ร้านตั้งค่าส่งและส่งของเอง · ระบบคิด GP อัตโนมัติ" />
      {data.demo && (
        <p className="mb-4 rounded-2xl border border-gold-500/40 px-4 py-3 text-xs text-ink-300">
          โหมดเดโม: ยังไม่ได้ตั้ง Supabase หรือยังไม่ได้รัน supabase/market/0001_products.sql + 0002_marketplace_v2.sql — ข้อมูลอยู่ในหน่วยความจำ หายเมื่อรีสตาร์ท
        </p>
      )}
      <MarketAdmin initial={data} />
    </>
  );
}
