import "server-only";
import { sendEmail } from "@/lib/email";
import { baht, carrierName, type MarketSettings, type Order } from "./config";
import { smsProvider } from "@/lib/otp";
import { site } from "@/lib/site";
import { trackPath } from "./store";
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

// ── แจ้งผู้ซื้อเมื่อสถานะเปลี่ยน (SMS ผ่านตัวส่ง OTP/ThaiBulkSMS · dev = log) + LINE hook (stub) ──

export async function sendSms(phone: string, message: string) {
  const p = smsProvider();
  if (!p) { console.info(`[market:sms:dev] ${phone} → ${message}`); return true; }
  try { await p.send(phone, message); return true; } catch (e) { console.error("[market] sms failed", e); return false; }
}

/** LINE notify hook (stub): ตั้ง URL ในหลังบ้าน (หรือ env MARKET_LINE_WEBHOOK_URL) → POST JSON; ไม่ตั้ง = ข้าม */
export async function lineHook(event: string, o: Order, settings?: Pick<MarketSettings, "line_notify_url">) {
  const url = settings?.line_notify_url || process.env.MARKET_LINE_WEBHOOK_URL;
  if (!url || !/^https:\/\//.test(url)) return false;
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, order_no: o.order_no, status: o.status, total: o.total, tracking_no: o.tracking_no }) })
    .then((r) => r.ok).catch(() => false);
}

/** ส่ง SMS เฉพาะตอน "ยืนยันแล้ว" และ "จัดส่งแล้ว" */
export async function notifyStatus(o: Order, settings?: Pick<MarketSettings, "line_notify_url">) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || site.url;
  const link = `${base}${trackPath(o)}`;
  let msg = "";
  if (o.status === "paid") msg = `Mister Bamrungsuk: คำสั่งซื้อ ${o.order_no} ยืนยันการชำระแล้ว กำลังเตรียมจัดส่ง ติดตามสถานะ ${link}`;
  else if (o.status === "shipped") msg = `Mister Bamrungsuk: คำสั่งซื้อ ${o.order_no} จัดส่งแล้ว ${carrierName(o.carrier)} เลขพัสดุ ${o.tracking_no ?? "-"} ติดตาม ${link}`;
  if (!msg) return false;
  lineHook(`order.${o.status}`, o, settings).catch(() => {});
  return sendSms(o.phone, msg);
}
