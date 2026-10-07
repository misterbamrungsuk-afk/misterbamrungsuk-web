import { NextResponse } from "next/server";
import { clientIp, rateLimited } from "@/lib/customer/auth";
import { MAX_QTY, type OrderItem } from "@/lib/market/config";
import { listPublished, priceCart } from "@/lib/market/store";

export const runtime = "nodejs";

// คำนวณราคาตะกร้า (ยอดสินค้า → ส่วนลดโค้ด → ค่าส่ง) จากราคาในฐานข้อมูล — ใช้แสดงผลในตะกร้า
export async function POST(req: Request) {
  if (rateLimited(`mkp:${clientIp(req)}`, 40, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ลองบ่อยเกินไป" }, { status: 429 });
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
    shipping_fee: r.shipping_fee, shipping_tbd: r.settings.shipping_fee == null, free_threshold: r.settings.free_threshold,
    delivery_days: r.settings.delivery_days, total: r.total,
  });
}
