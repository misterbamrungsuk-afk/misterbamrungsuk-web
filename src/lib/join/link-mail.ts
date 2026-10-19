import "server-only";
import { siteUrl } from "@/lib/site-url";
import { signResume } from "@/lib/join/resume";
import { profileLinkMail, sendEmail } from "@/lib/email";
import type { Applicant } from "@/lib/join/store";

// ลิงก์เข้าโปรไฟล์ Part-Time ด้วยตัวเอง (สมัครแล้วออกจากแอป / เปลี่ยนเครื่อง / LINE ↔ Chrome คุกกี้แยกกัน)
// ลิงก์ = โทเคน resume ลงลายเซ็นเดียวกับที่แอดมินออก (มี iat · อายุ 30 วัน · "ยกเลิกลิงก์" ของแอดมิน/ออกจากทุกเครื่องตัดได้)

/** ตรวจอีเมลแบบพอใช้ (ไม่มีช่องว่าง · มี @ และโดเมนมีจุด) — คืนค่าที่ตัดช่องว่าง/ตัวเล็กแล้ว หรือ null */
export function cleanEmail(v: unknown): string | null {
  const e = String(v ?? "").trim().toLowerCase();
  if (e.length < 6 || e.length > 120) return null;
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e) && !e.includes("..") ? e : null;
}

export const EMAIL_ERROR = "กรอกอีเมลให้ถูกต้อง เช่น name@gmail.com · ใช้รับลิงก์เข้าโปรไฟล์และใบเสร็จ";

/** a***@gmail.com — แสดงให้เจ้าของดูว่าส่งไปที่ไหน (ไม่โชว์เต็ม) */
export function maskEmail(e: string): string {
  const [u, d] = e.split("@");
  if (!u || !d) return "";
  return `${u.slice(0, Math.min(2, u.length))}${"*".repeat(Math.min(6, Math.max(2, u.length - 2)))}@${d}`;
}

export function profileLink(req: Request, mb: string): string {
  return `${siteUrl(req)}/join/go?t=${encodeURIComponent(signResume(mb))}`;
}

/** ส่งลิงก์ใหม่ไปอีเมลที่ใช้สมัคร · ไม่มีอีเมล = false */
export async function emailProfileLink(req: Request, row: Applicant, note?: string): Promise<boolean> {
  if (!cleanEmail(row.email)) return false;
  const link = profileLink(req, row.mb_code);
  await sendEmail(profileLinkMail({ to: row.email, mb_code: row.mb_code, nickname: row.nickname, link, note: note ?? "คุณขอลิงก์เข้าโปรไฟล์ Part-Time ใหม่ กดปุ่มด้านล่างเพื่อเข้าโปรไฟล์" }));
  return true;
}

/** ใบสมัครที่ขอลิงก์ได้ (ไม่ถูกปฏิเสธ/คืนเงิน) */
export const linkable = (r: Applicant) => r.status !== "rejected" && r.status !== "refunded";
