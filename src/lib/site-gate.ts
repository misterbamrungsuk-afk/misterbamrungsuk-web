// รหัสเข้าเว็บ (ล็อกทั้งแอประหว่างยังไม่เปิดตัว) — ตั้ง SITE_PASSWORD ใน env; ไม่ตั้ง = ไม่ล็อก
export const GATE_COOKIE = "mb_gate";

export async function gateToken(password: string) {
  const data = new TextEncoder().encode(`mb-gate:${password}:${process.env.ADMIN_SESSION_SECRET ?? ""}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Marketplace v2 สาธารณะ: โรงแรม/สปา/หน้าร้าน/ติดตามออเดอร์/นโยบาย + พอร์ทัลร้านค้า (มีล็อกอินของตัวเอง) */
export function marketPublic(p: string) {
  const under = (b: string) => p === b || p.startsWith(`${b}/`);
  return under("/stay") || under("/hotels") || under("/spas") || under("/shop") || under("/policy") || under("/vendor") || p === "/orders/track";
}

// หน้าที่เปิดได้โดยไม่ต้องใส่รหัส (หน้ารับสมัครมีผู้สมัครจริงใช้อยู่)
export function gateExempt(p: string) {
  return (
    p === "/gate" || p === "/api/gate" || p === "/soon" || p === "/privacy" || p.startsWith("/privacy/") ||
    p.startsWith("/api/cron/") || // Vercel Cron (ป้องกันด้วย CRON_SECRET เอง)
    p === "/join" || p.startsWith("/join/") || p.startsWith("/api/join/") || p.startsWith("/api/pt/") ||
    p.startsWith("/api/otp/") || // OTP ใช้ในหน้ารับสมัคร /join/pay (มี Turnstile + rate limit)
    p === "/partner" || p.startsWith("/partner/") || p.startsWith("/api/partner/") ||
    // Marketplace หน้าแรก (สาธารณะ)
    p === "/" || p === "/work-with-us" || p === "/map" || p.startsWith("/p/") || p.startsWith("/api/public/") || p === "/market" || p.startsWith("/market/") || marketPublic(p) ||
    p === "/products" || p.startsWith("/products/") || p === "/cart" || p.startsWith("/api/market/") || p === "/api/spas" ||
    p.startsWith("/_next") || p === "/favicon.ico" || p === "/manifest.webmanifest" ||
    p === "/sw.js" || p.startsWith("/pwa-icon") || p.startsWith("/brand")
  );
}

// ─── โหมด "เปิดเฉพาะรับสมัคร Part-Time" (บอสสั่ง 20 ต.ค. 2569) ───
// ค่าเริ่มต้น = เปิด · เปิดเว็บเต็ม: ตั้ง env SITE_MODE=full แล้ว redeploy
export const PT_ONLY = process.env.SITE_MODE !== "full";

/** หน้าที่เปิดได้ระหว่างโหมดรับสมัคร Part-Time — นอกนั้นแสดง "เปิดให้บริการเร็ว ๆ นี้" (/soon)
 *  ปิดเฉพาะ "หน้า" · API ยังทำงาน (โปรไฟล์ Part-Time ใช้ API งาน/SOS/แจ้งเตือน และ API ลูกค้าต้องล็อกอินอยู่แล้ว) */
export function ptOnlyOpen(p: string) {
  const under = (b: string) => p === b || p.startsWith(`${b}/`);
  return (
    // หน้าตัวอย่าง (mockup): แผนที่ · โปรไฟล์เพื่อน · แชทตัวอย่าง — กดจอง/จ่าย/ล็อกอิน → /soon
    p === "/map" || under("/p") ||
    p === "/" || p === "/work-with-us" || under("/join") || under("/privacy") || p === "/page/terms" || under("/policy") ||
    p === "/gate" || p === "/soon" || p === "/offline" || p === "/login" ||
    under("/admin") || p === "/admin-login" || under("/sales") || // Sale Man: หน้าแนะนำ + ล็อกอิน + แดชบอร์ดของตัวเอง
    p.startsWith("/api") || p.startsWith("/_next") || p.startsWith("/pwa-icon") || p.startsWith("/brand") ||
    // ไฟล์ (มีนามสกุล) เช่น favicon / manifest / sw.js / icon.png / robots.txt
    /\/[^/]+\.[a-z0-9]+$/i.test(p) || p === "/manifest.webmanifest"
  );
}
