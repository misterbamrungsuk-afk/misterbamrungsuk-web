import { NextResponse } from "next/server";
import { listPartners, stripSecret } from "@/lib/partner/store";
import { PARTNER_SPAS, type PartnerSpa } from "@/lib/booking";

// รายชื่อสปาพาร์ทเนอร์ที่เปิดแสดงอยู่ (อ่านอย่างเดียวจาก partner store) — ถ้ายังไม่มี ใช้ข้อมูลตัวอย่าง
export const dynamic = "force-dynamic";

export async function GET() {
  let spas: PartnerSpa[] = [];
  try {
    const all = (await listPartners()).map(stripSecret);
    spas = all
      .filter((p) => p.type === "สปา" && (p.account_status === "active" || p.status === "active"))
      .map((p) => ({ id: p.id, name: p.business_name, area: p.province, km: null, rating: null, price: 0 }));
  } catch {
    spas = [];
  }
  return NextResponse.json({ spas: spas.length ? spas : PARTNER_SPAS, sample: spas.length === 0 });
}
