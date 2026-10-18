import { listCategories } from "@/lib/market/store";
import { MHeader, MShell } from "../../products/m-kit";
import { SellForm } from "./sell-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "เปิดร้านกับเรา — Marketplace Mister Bamrungsuk" };

// สมัครเปิดร้าน/แบรนด์บน Marketplace (ร้านสมัครเอง) → ทีมงานตรวจเอกสาร → อนุมัติแล้วได้ลิงก์ตั้งรหัสผ่านพอร์ทัลร้านค้า
export default async function SellPage() {
  const cats = await listCategories().catch(() => []);
  return (
    <MShell className="pb-10">
      <MHeader back="/market" eyebrow="SELL WITH US" title="เปิดร้านกับเรา" cart={false} />
      <SellForm categories={[...cats.map((c) => c.name), "อื่น ๆ"]} />
    </MShell>
  );
}
