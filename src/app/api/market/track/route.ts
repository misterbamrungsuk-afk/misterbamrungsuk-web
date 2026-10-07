import { NextResponse } from "next/server";
import { clientIp, rateLimited } from "@/lib/customer/auth";
import { buyerPhone, publicOrder } from "@/lib/market/buyer";
import { checkOrderToken, findOrderByNo, getOrder, listOrders } from "@/lib/market/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ติดตามคำสั่งซื้อ
// GET ?id=&t=  → ลิงก์ลงลายเซ็นที่ได้หลังสั่งซื้อ/ใน SMS
// GET ?mine=1  → "คำสั่งซื้อของฉัน" ของเบอร์ที่ยืนยัน OTP แล้ว
// POST {order_no} → ค้นด้วยเลขคำสั่งซื้อ + เบอร์ที่ยืนยัน OTP แล้ว (ต้องตรงกัน)
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  if (sp.get("mine")) {
    const phone = await buyerPhone();
    if (!phone) return NextResponse.json({ ok: false, error: "ยืนยันเบอร์โทรด้วย OTP ก่อน" }, { status: 401 });
    const orders = (await listOrders()).filter((o) => o.phone === phone).map(publicOrder);
    return NextResponse.json({ ok: true, phone: `0${phone.slice(2)}`, orders });
  }
  const id = sp.get("id") ?? "", t = sp.get("t") ?? "";
  if (!id || !checkOrderToken(id, t)) return NextResponse.json({ ok: false, error: "ลิงก์ไม่ถูกต้อง" }, { status: 401 });
  const o = await getOrder(id);
  if (!o) return NextResponse.json({ ok: false, error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  return NextResponse.json({ ok: true, order: publicOrder(o) });
}

export async function POST(req: Request) {
  if (rateLimited(`mkt:${clientIp(req)}`, 30, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ลองบ่อยเกินไป" }, { status: 429 });
  const phone = await buyerPhone();
  if (!phone) return NextResponse.json({ ok: false, error: "ยืนยันเบอร์โทรด้วย OTP ก่อน" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { order_no?: string };
  const o = await findOrderByNo(String(b.order_no ?? "").slice(0, 40));
  // ไม่บอกว่าเลขมีอยู่จริงหรือไม่ ถ้าเบอร์ไม่ตรง
  if (!o || o.phone !== phone) return NextResponse.json({ ok: false, error: "ไม่พบคำสั่งซื้อนี้สำหรับเบอร์ที่ยืนยัน" }, { status: 404 });
  return NextResponse.json({ ok: true, order: publicOrder(o) });
}
