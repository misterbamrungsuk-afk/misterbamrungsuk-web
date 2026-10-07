import { listOrders, listProducts, listVendors, marketDemo, monthlySummary } from "@/lib/market/store";
import { PageHead } from "../admin-nav";
import { MarketAdmin } from "./market-admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketplace · แอดมิน Mister Bamrungsuk" };

// ร้านค้า (GP %) · สินค้า (เลข อย. บังคับก่อน publish) · ตรวจสลิปคำสั่งซื้อ · สรุป GP ต่อเดือน
export default async function MarketAdminPage() {
  const [vendors, products, orders] = await Promise.all([listVendors(), listProducts(), listOrders()]);
  return (
    <>
      <PageHead title="Marketplace สินค้า" sub="ตะกร้า + QR + สลิป · แอดมินยืนยัน · ร้านค้าส่งของเอง · ระบบคิด GP อัตโนมัติ" />
      {marketDemo() && (
        <p className="mb-4 rounded-2xl border border-gold-500/40 px-4 py-3 text-xs text-ink-300">
          โหมดเดโม: ยังไม่ได้ตั้ง Supabase หรือยังไม่ได้รัน supabase/market/0001_products.sql — ข้อมูลอยู่ในหน่วยความจำ หายเมื่อรีสตาร์ท
        </p>
      )}
      <MarketAdmin initial={{ vendors, products, orders, summary: monthlySummary(orders, vendors) }} />
    </>
  );
}
