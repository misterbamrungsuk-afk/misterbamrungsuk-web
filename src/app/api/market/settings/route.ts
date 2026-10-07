import { NextResponse } from "next/server";
import { getSettings } from "@/lib/market/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ค่าส่ง / เกณฑ์ส่งฟรี / ระยะเวลาจัดส่ง (สาธารณะ — ใช้ในตะกร้า) · null = [รอกำหนด]
export async function GET() {
  const s = await getSettings();
  return NextResponse.json({ ok: true, shipping_fee: s.shipping_fee, free_threshold: s.free_threshold, delivery_days: s.delivery_days });
}
