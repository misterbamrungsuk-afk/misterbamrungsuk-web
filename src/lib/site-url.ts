// ที่อยู่เว็บสำหรับสร้างลิงก์ส่งออกไป (อีเมลตั้งรหัสผ่าน · ลิงก์ผู้สมัคร) — ห้ามเชื่อ Host header ของคำขอ (ปลอมได้)
import { isProdDeploy } from "@/lib/session-secret";
export function siteUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  return isProdDeploy() ? "https://misterbamrungsuk.com" : new URL(req.url).origin;
}
