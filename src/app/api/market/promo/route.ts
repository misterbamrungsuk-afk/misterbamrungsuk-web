import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { clientIp } from "@/lib/customer/auth";
import { MAX_QTY, deliveryText, type OrderItem } from "@/lib/market/config";
import { listPublished, priceCart } from "@/lib/market/store";

export const runtime = "nodejs";

// คำนวณราคาตะกร้า (ยอดสินค้า → ส่วนลดโค้ด → ค่าส่งแยกร้าน) จากราคาในฐานข้อมูล — ใช้แสดงผลในตะกร้า
export async function POST(req: Request) {
  if (await limited(`mkp:${clientIp(req)}`, 40, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ลองบ่อยเกินไป" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { code?: string; items?: { id?: string; qty?: number }[] };
  const products = await listPublished();
  const items: OrderItem[] = [];
  for (const l of (Array.isArray(b.items) ? b.items : []).slice(0, 30)) {
    const p = products.find((x) => x.id === l.id);
    const qty = Math.floor(Number(l.qty));
    if (p && qty >= 1 && qty <= MAX_QTY) items.push({ product_id: p.id, vendor_id: p.vendor_id, name: p.name, price: p.price, qty });
  }
  const r = await priceCart(items, String(b.code ?? "").slice(0, 30));
  return NextResponse.json({
    ok: true, subtotal: r.subtotal, discount: r.discount, code: r.promo?.code ?? null, promo_error: r.promoError || null,
    shipping_fee: r.shipping_fee, groups: r.groups, delivery_days: deliveryText(r.settings), total: r.total,
  });
}
