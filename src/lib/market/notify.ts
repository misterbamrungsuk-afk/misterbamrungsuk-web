import "server-only";
import { sendEmail } from "@/lib/email";
import { baht, type Order } from "./config";

const ENT: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ENT[c]);

/** แจ้งทีม: มีสลิปคำสั่งซื้อสินค้ารอตรวจ (ไม่บล็อกผู้ซื้อ — ล้มเหลวแค่ log) */
export async function notifyOrderSlip(o: Order) {
  const admin = process.env.ADMIN_NOTIFY_EMAIL;
  if (!admin) return false;
  const items = o.items.map((i) => `<li>${esc(i.name)} × ${i.qty} — ฿${baht(i.price * i.qty)}</li>`).join("");
  const html = `<div style="font-family:Tahoma,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #d4af37;border-radius:16px"><p style="letter-spacing:.2em;font-size:12px;color:#8f5e00;margin:0">MISTER BAMRUNGSUK · MARKETPLACE</p><h2>สลิปคำสั่งซื้อรอตรวจ</h2><p>${esc(o.order_no)} · ${esc(o.buyer_name)} · ฿${baht(o.total)}</p><ul style="font-size:14px">${items}</ul><p style="font-size:13px;color:#6b6152">ตรวจได้ที่ /admin/market</p></div>`;
  return sendEmail({ to: admin.split(",").map((s) => s.trim()), subject: `[สลิปสินค้า] ${o.order_no} ฿${baht(o.total)}`, html }).catch(() => false);
}
