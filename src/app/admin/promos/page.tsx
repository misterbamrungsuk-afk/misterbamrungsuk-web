import { listCodes } from "@/lib/codes";
import { PageHead } from "../admin-nav";
import { PromosClient } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "โค้ดโปรโมชัน · บัตรของขวัญ — แอดมิน" };

// สร้างโค้ดโปรโมชัน (เครดิตเข้ากระเป๋าลูกค้า · ต้นทุนการตลาด = บัญชี promo) + ดูบัตรของขวัญที่ลูกค้าซื้อ
export default async function PromosPage() {
  const codes = await listCodes().catch(() => []);
  return (
    <>
      <PageHead title="โค้ดโปรโมชัน · บัตรของขวัญ" sub="ลูกค้ากรอกโค้ดที่ ระดับสมาชิก › ใช้โค้ด → ได้เครดิตเข้ากระเป๋า (คนละครั้งต่อโค้ด) · บัตรของขวัญ = ลูกค้าซื้อจากกระเป๋าให้เพื่อน" />
      <PromosClient initial={codes} />
    </>
  );
}
