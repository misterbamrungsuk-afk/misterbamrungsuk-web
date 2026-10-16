import { sessionSecret } from "@/lib/session-secret";
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getPartner, type Partner } from "./store";

// เซสชันพาร์ทเนอร์ — cookie แยกจากลูกค้า (mb_partner) ลงลายเซ็น HMAC แบบเดียวกับ customer/auth
// รหัสผ่านใช้ makeHash/checkHash (scrypt) จาก customer/auth
export const PARTNER_COOKIE = "mb_partner";
const DAYS = 30;
const secret = () => sessionSecret();

function sign(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${createHmac("sha256", secret()).update(body).digest("base64url")}`;
}
function verify<T extends { exp: number }>(token: string | undefined, kind: string): T | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const want = Buffer.from(createHmac("sha256", secret()).update(body).digest("base64url"));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { k?: string };
    return p.k === kind && p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}

export const signPartnerSession = (pid: string) => sign({ k: "ps", pid, exp: Date.now() + DAYS * 86400_000 });
export const partnerCookieOptions = {
  httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: DAYS * 86400,
};

/** token หลังส่งฟอร์มสมัคร — ใช้ชำระค่าแพ็กเกจ + ตั้งรหัสผ่าน (อายุ 14 วัน) */
export const signApplyToken = (pid: string) => sign({ k: "pa", pid, exp: Date.now() + 14 * 86400_000 });
export const verifyApplyToken = (t: string | null | undefined) => verify<{ pid: string; exp: number }>(t ?? undefined, "pa")?.pid ?? null;

/** พาร์ทเนอร์ที่ล็อกอินอยู่ (null = ไม่ได้ล็อกอิน / ถูกลบ) */
export async function currentPartner(): Promise<Partner | null> {
  const s = verify<{ pid: string; exp: number }>((await cookies()).get(PARTNER_COOKIE)?.value, "ps");
  if (!s) return null;
  const p = await getPartner(s.pid).catch(() => null);
  return p && p.password_hash ? p : null;
}
