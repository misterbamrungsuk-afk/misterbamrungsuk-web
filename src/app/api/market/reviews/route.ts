import { NextResponse } from "next/server";
import { clientIp, rateLimited } from "@/lib/customer/auth";
import { buyerPhone } from "@/lib/market/buyer";
import { flaggedClaims } from "@/lib/market/config";
import { addReview, reviewEligibility, setReviewHidden } from "@/lib/market/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?product= → เบอร์ที่ยืนยันแล้วรีวิวสินค้านี้ได้ไหม
export async function GET(req: Request) {
  const pid = new URL(req.url).searchParams.get("product") ?? "";
  const phone = await buyerPhone();
  if (!phone) return NextResponse.json({ ok: true, can: false, verified: false, reason: "ยืนยันเบอร์ที่ใช้สั่งซื้อก่อนรีวิว" });
  const r = await reviewEligibility(phone, pid);
  return NextResponse.json({ ok: true, verified: true, can: r.ok, reason: r.ok ? null : r.error });
}

// POST {product_id, stars, text, name} — เฉพาะผู้ซื้อที่มีคำสั่งซื้อสถานะ "สำเร็จ" ของสินค้านี้
export async function POST(req: Request) {
  if (rateLimited(`mkr:${clientIp(req)}`, 10, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ลองบ่อยเกินไป" }, { status: 429 });
  const phone = await buyerPhone();
  if (!phone) return NextResponse.json({ ok: false, error: "ยืนยันเบอร์โทรด้วย OTP ก่อน" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { product_id?: string; stars?: number; text?: string; name?: string };
  const text = String(b.text ?? "").trim();
  if (!(Number(b.stars) >= 1 && Number(b.stars) <= 5)) return NextResponse.json({ ok: false, error: "ให้คะแนน 1–5 ดาว" }, { status: 400 });
  try {
    const review = await addReview({ phone, product_id: String(b.product_id ?? ""), stars: Number(b.stars), text, name: String(b.name ?? "") });
    // ข้อความที่เข้าข่ายอ้างสรรพคุณ — ซ่อนไว้ก่อนให้แอดมินตรวจ
    if (flaggedClaims(text).length) {
      await setReviewHidden(review.id, true);
      return NextResponse.json({ ok: true, held: true });
    }
    return NextResponse.json({ ok: true, held: false });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 403 });
  }
}
