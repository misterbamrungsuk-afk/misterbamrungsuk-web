// รหัสเข้าเว็บ (ล็อกทั้งแอประหว่างยังไม่เปิดตัว) — ตั้ง SITE_PASSWORD ใน env; ไม่ตั้ง = ไม่ล็อก
export const GATE_COOKIE = "mb_gate";

export async function gateToken(password: string) {
  const data = new TextEncoder().encode(`mb-gate:${password}:${process.env.ADMIN_SESSION_SECRET ?? ""}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// หน้าที่เปิดได้โดยไม่ต้องใส่รหัส (หน้ารับสมัครมีผู้สมัครจริงใช้อยู่)
export function gateExempt(p: string) {
  return (
    p === "/gate" || p === "/api/gate" ||
    p.startsWith("/api/cron/") || // Vercel Cron (ป้องกันด้วย CRON_SECRET เอง)
    p === "/join" || p.startsWith("/join/") || p.startsWith("/api/join/") ||
    p.startsWith("/api/otp/") || // OTP ใช้ในหน้ารับสมัคร /join/pay (มี Turnstile + rate limit)
    p === "/partner" || p.startsWith("/partner/") || p.startsWith("/api/partner/") ||
    // Marketplace หน้าแรก (สาธารณะ)
    p === "/" || p === "/market" || p.startsWith("/market/") || p === "/hotels" || p === "/spas" ||
    p === "/products" || p.startsWith("/products/") || p === "/cart" || p.startsWith("/api/market/") || p === "/api/spas" ||
    p.startsWith("/_next") || p === "/favicon.ico" || p === "/manifest.webmanifest" ||
    p === "/sw.js" || p.startsWith("/pwa-icon") || p.startsWith("/brand")
  );
}
