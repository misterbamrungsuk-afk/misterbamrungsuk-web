import "server-only";
import { cookies } from "next/headers";
import { PHONE_COOKIE, readPhoneToken } from "@/lib/otp";
import type { Order } from "./config";

/** เบอร์ผู้ซื้อที่ยืนยัน OTP แล้ว (cookie mb_phone_ok, 668xxxxxxxx) — null = ยังไม่ยืนยัน */
export async function buyerPhone() {
  return readPhoneToken((await cookies()).get(PHONE_COOKIE)?.value);
}

/** ข้อมูลออเดอร์ที่ผู้ซื้อเห็นได้ (ไม่ส่ง ip / สลิป / ผู้ตัดสิน / GP) */
export const publicOrder = (o: Order) => ({
  id: o.id, order_no: o.order_no, buyer_name: o.buyer_name, phone: `0${o.phone.slice(2, 4)}-xxx-${o.phone.slice(-4)}`, address: o.address,
  items: o.items.map(({ product_id, name, price, qty }) => ({ product_id, name, price, qty })),
  subtotal: o.subtotal ?? o.total, discount: o.discount ?? 0, promo_code: o.promo_code ?? null, shipping_fee: o.shipping_fee ?? 0, total: o.total,
  status: o.status, has_slip: !!o.slip_path, tracking_no: o.tracking_no, carrier: o.carrier ?? null,
  vendor_tracking: Object.values(o.vendor_tracking ?? {}).map((t) => ({ tracking_no: t.tracking_no, carrier: t.carrier })),
  reject_reason: o.status === "rejected" ? o.reject_reason ?? null : null,
  created_at: o.created_at, paid_at: o.paid_at, shipped_at: o.shipped_at ?? null, done_at: o.done_at ?? null,
});
export type PublicOrder = ReturnType<typeof publicOrder>;
