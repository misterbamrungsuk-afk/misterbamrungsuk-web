import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { currentCustomer } from "@/lib/customer/auth";
import { clientIp } from "@/lib/customer/auth";
import { readPhoneToken } from "@/lib/otp";
import { TURNSTILE_ERROR, verifyTurnstile } from "@/lib/turnstile";
import { MAX_QTY, type OrderItem } from "@/lib/market/config";
import { createOrder, getSettings, listPublished, orderToken, payWithWallet, priceCart, trackPath } from "@/lib/market/store";
import { notifyStatus } from "@/lib/market/notify";

export const runtime = "nodejs";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

// สร้างคำสั่งซื้อ: ต้องยืนยันเบอร์ OTP แล้ว (cookie mb_phone_ok) + Turnstile + ยืนยันอายุ 20+
// ราคาคิดจากฐานข้อมูลเสมอ (ไม่เชื่อราคาจากหน้าเว็บ)
// pay: "wallet" = ตัดจากกระเป๋าเงินทันที (ต้องล็อกอิน · ยอดพอ) → ออเดอร์ "ยืนยันแล้ว" รอร้านส่งของ เหมือนแอดมินยืนยันสลิป
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await limited(`mko:${ip}`, 10, 15 * 60_000)) return bad("สั่งซื้อบ่อยเกินไป กรุณารอสักครู่", 429);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!(await verifyTurnstile(b.turnstile, ip))) return bad(TURNSTILE_ERROR);

  const m = /(?:^|;\s*)mb_phone_ok=([^;]+)/.exec(req.headers.get("cookie") ?? "");
  const phone = readPhoneToken(m ? decodeURIComponent(m[1]) : undefined);
  if (!phone) return bad("กรุณายืนยันเบอร์โทรด้วย OTP ก่อน", 401);
  if (b.age_confirm !== true) return bad("กรุณายืนยันว่าอายุ 20 ปีขึ้นไป");

  const buyer_name = str(b.name, 80), address = str(b.address, 500);
  if (buyer_name.length < 2) return bad("กรอกชื่อผู้รับ");
  if (address.length < 10) return bad("กรอกที่อยู่จัดส่งให้ครบ");

  const lines = Array.isArray(b.items) ? (b.items as { id?: unknown; qty?: unknown }[]).slice(0, 30) : [];
  const products = await listPublished();
  const items: OrderItem[] = [];
  for (const l of lines) {
    const p = products.find((x) => x.id === l.id);
    const qty = Math.floor(Number(l.qty));
    if (!p || !(qty >= 1 && qty <= MAX_QTY)) continue;
    const ex = items.find((i) => i.product_id === p.id);
    if (ex) ex.qty += qty;
    else items.push({ product_id: p.id, vendor_id: p.vendor_id, name: p.name, price: p.price, qty });
  }
  if (!items.length) return bad("ตะกร้าว่าง หรือสินค้าไม่พร้อมขาย");
  for (const it of items) {
    const p = products.find((x) => x.id === it.product_id)!;
    if (it.qty > p.stock) return bad(`${p.name} เหลือ ${p.stock} ชิ้น`);
  }

  const wallet = b.pay === "wallet";
  const me = await currentCustomer().catch(() => null);
  if (wallet) {
    if (!me) return bad("เข้าสู่ระบบก่อนชำระจากกระเป๋าเงิน", 401);
    // ตรวจยอดก่อนสร้างออเดอร์ (ตัดจริงใน ledger อีกชั้น — ไม่พอ ณ ตอนตัด = ออเดอร์ถูกปิด)
    const { balances } = await import("@/lib/wallet");
    const [pr, bal] = await Promise.all([priceCart(items, str(b.promo_code, 30) || null), balances("customer", me.sub).catch(() => ({} as Record<string, number>))]);
    if ((bal.available ?? 0) < Math.round(pr.total * 100)) return bad(`ยอดในกระเป๋าเงินไม่พอ (มี ฿${((bal.available ?? 0) / 100).toLocaleString("th-TH")} · ต้องชำระ ฿${pr.total.toLocaleString("th-TH")})`, 402);
  }
  try {
    let o = await createOrder({ buyer_name, phone, address, items, ip, promo_code: str(b.promo_code, 30) || null, customer: me ? { id: me.sub, email: me.email } : null, pay: wallet ? "wallet" : "slip" });
    if (wallet) {
      try { o = await payWithWallet(o); }
      catch (e) { return bad(/ไม่พอ/.test((e as Error).message) ? "ยอดในกระเป๋าเงินไม่พอ" : "ตัดเงินจากกระเป๋าไม่สำเร็จ กรุณาลองใหม่", 402); }
      getSettings().then((s) => notifyStatus(o, s)).catch(() => {});
    }
    return NextResponse.json({
      ok: true, id: o.id, order_no: o.order_no, total: o.total, token: orderToken(o.id), track: trackPath(o),
      subtotal: o.subtotal, discount: o.discount, shipping_fee: o.shipping_fee, status: o.status, pay_method: o.pay_method ?? "slip",
    });
  } catch (e) {
    if (/โค้ด|กระเป๋า|ระบบยังไม่พร้อม/.test((e as Error).message)) return bad((e as Error).message);
    console.error("market order", e);
    return bad("บันทึกคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่", 500);
  }
}
