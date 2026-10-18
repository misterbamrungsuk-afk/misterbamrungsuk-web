import { NextResponse } from "next/server";
import { deliveryText } from "@/lib/market/config";
import { getSettings } from "@/lib/market/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ค่าส่งกลาง / เกณฑ์ส่งฟรี / ระยะเวลาจัดส่ง (สาธารณะ) · ร้านที่ตั้งค่าส่งเองใช้ของร้าน (คิดใน /api/market/promo) · null = ไม่คิดค่าส่ง
export async function GET() {
  const s = await getSettings();
  return NextResponse.json({ ok: true, shipping_fee: s.shipping_fee, free_threshold: s.free_threshold, delivery_days: deliveryText(s) });
}
