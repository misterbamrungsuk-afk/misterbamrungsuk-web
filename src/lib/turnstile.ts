import "server-only";

// Cloudflare Turnstile — ตรวจ token ฝั่งเซิร์ฟเวอร์ (ไม่ตั้ง TURNSTILE_SECRET_KEY = ข้าม สำหรับ dev)
export const turnstileEnabled = () => !!process.env.TURNSTILE_SECRET_KEY;

export async function verifyTurnstile(token: unknown, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || process.env.TURNSTILE_SITE_KEY;
    if (siteKey && process.env.VERCEL) { console.error("TURNSTILE_SECRET_KEY missing while site key is set — rejecting"); return false; }
    return true;
  }
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "local") body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const out = (await res.json()) as { success?: boolean };
    return !!out.success;
  } catch (e) {
    console.error("turnstile verify", e);
    return false;
  }
}

export const TURNSTILE_ERROR = "ยืนยันว่าไม่ใช่บอทไม่สำเร็จ กรุณาลองใหม่";
