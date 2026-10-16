import "server-only";
import { sendEmail } from "@/lib/email";
import { PARTNER_PACKAGES } from "./config";
import type { Partner } from "./store";
import type { Purchase } from "./portal-types";

// sheet + อีเมลแจ้งทีม — ไม่บล็อกการสมัคร (ล้มเหลวก็แค่ log)
// ชีต: ใช้ webhook Apps Script เดียวกับ /join (GOOGLE_SHEETS_WEBHOOK_URL/TOKEN) โดยส่ง sheet: "partners"
//  → สคริปต์ต้องอ่าน body.sheet เป็นชื่อแท็บ (ไม่งั้นจะต่อแถวลงแท็บเดิมของสคริปต์)

const COLUMNS = ["วันที่", "ธุรกิจ", "ประเภท", "จังหวัด", "ผู้ติดต่อ", "โทร", "อีเมล", "LINE", "ลิงก์", "แผนโปรโมท", "ข้อความ", "สถานะ", "id"];

export async function syncPartnerSheet(p: Partner): Promise<boolean> {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const token = process.env.GOOGLE_SHEETS_WEBHOOK_TOKEN;
  // ปิดไว้จนกว่า Apps Script จะรองรับ body.sheet (ไม่งั้นแถวพาร์ทเนอร์จะไปปนแท็บผู้สมัคร) — เปิดด้วย PARTNER_SHEET_SYNC=1
  if (!url || !token || process.env.PARTNER_SHEET_SYNC !== "1") return false;
  const row = [new Date(p.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }), p.business_name, p.type, p.province, p.contact_name, p.tel, p.email, p.line_id, p.links, PARTNER_PACKAGES[p.package].label, p.message, p.status, p.id];
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ token, sheet: "partners", columns: COLUMNS, row }) });
    const out = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return res.ok && out.ok === true;
  } catch {
    return false;
  }
}

const ENT: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ENT[c]);

export async function notifyAdmin(p: Partner) {
  const admin = process.env.ADMIN_NOTIFY_EMAIL;
  if (!admin) return false;
  const rows: [string, string][] = [["ธุรกิจ", p.business_name], ["ประเภท", p.type], ["จังหวัด", p.province], ["ผู้ติดต่อ", p.contact_name], ["โทร", p.tel], ["อีเมล", p.email], ["LINE", p.line_id || "-"], ["แผนโปรโมท", PARTNER_PACKAGES[p.package].label], ["ข้อความ", p.message || "-"]];
  const trs = rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b6152">${esc(k)}</td><td style="font-weight:600">${esc(v)}</td></tr>`).join("");
  const html = `<div style="font-family:Tahoma,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #d4af37;border-radius:16px"><p style="letter-spacing:.2em;font-size:12px;color:#8f5e00;margin:0">MISTER BAMRUNGSUK · PARTNER</p><h2>มีพาร์ทเนอร์สนใจใหม่</h2><table style="font-size:14px">${trs}</table><p style="font-size:13px;color:#6b6152">จัดการได้ที่ /admin/partners</p></div>`;
  return sendEmail({ to: admin.split(",").map((x) => x.trim()), subject: `[พาร์ทเนอร์ใหม่] ${p.business_name}`, html });
}

/** แจ้งทีม: มีสลิปค่าแผนโปรโมทพาร์ทเนอร์รอตรวจ */
export async function notifyPurchase(p: Partner, x: Purchase) {
  const admin = process.env.ADMIN_NOTIFY_EMAIL;
  if (!admin) return false;
  const html = `<div style="font-family:Tahoma,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #d4af37;border-radius:16px"><p style="letter-spacing:.2em;font-size:12px;color:#8f5e00;margin:0">MISTER BAMRUNGSUK · PARTNER</p><h2>สลิปค่าแผนโปรโมทรอตรวจ</h2><p>${esc(p.business_name)} · ${esc(PARTNER_PACKAGES[x.package].label)} · ฿${x.amount.toLocaleString("th-TH")}</p><p style="font-size:13px;color:#6b6152">ใบแจ้งหนี้ ${esc(x.invoice_no)} · ตรวจได้ที่ /admin/partners</p></div>`;
  return sendEmail({ to: admin.split(",").map((s) => s.trim()), subject: `[สลิปพาร์ทเนอร์] ${p.business_name} ${x.invoice_no}`, html }).catch(() => false);
}
