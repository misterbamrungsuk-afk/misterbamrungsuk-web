import { NextResponse } from "next/server";
import { marketPartners } from "@/lib/market/partners";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { hotels, spas } = await marketPartners();
  // ส่งเฉพาะข้อมูลหน้าร้าน — ตัดเบอร์/LINE ของผู้ติดต่อออก (ข้อมูลส่วนตัวจากใบสมัคร)
  const strip = (l: object[]) => l.map((x) => { const r = { ...(x as Record<string, unknown>) }; delete r.tel; delete r.line_id; return r; });
  return NextResponse.json({ ok: true, hotels: strip(hotels), spas: strip(spas) });
}
