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

/** token หลังส่งฟอร์มสมัคร — ใช้ชำระค่าแผนโปรโมท + ตั้งรหัสผ่าน (อายุ 14 วัน) */
export const signApplyToken = (pid: string) => sign({ k: "pa", pid, exp: Date.now() + 14 * 86400_000 });
export const verifyApplyToken = (t: string | null | undefined) => verify<{ pid: string; exp: number }>(t ?? undefined, "pa")?.pid ?? null;

/** ลิงก์ตั้ง/รีเซ็ตรหัสผ่านที่แอดมินส่งให้ (อายุ 7 วัน) — ผูกกับรหัสผ่านปัจจุบัน (fp) ใช้ได้ครั้งเดียว: ตั้งรหัสแล้วลิงก์เก่าหมดอายุทันที */
const fpOf = (hash: string | null | undefined) => (hash ? createHmac("sha256", secret()).update(`pfp:${hash}`).digest("base64url").slice(0, 12) : "none");
export const signResetToken = (pid: string, hash: string | null | undefined) => sign({ k: "pr", pid, fp: fpOf(hash), exp: Date.now() + 7 * 86400_000 });
/** token ที่ใช้หน้า /partner/register: ใบสมัคร (pa — ตั้งครั้งแรก) หรือรีเซ็ตจากแอดมิน (pr) */
export function readRegisterToken(t: string | null | undefined): { pid: string; reset: boolean; fp?: string } | null {
  const a = verify<{ pid: string; exp: number }>(t ?? undefined, "pa");
  if (a) return { pid: a.pid, reset: false };
  const r = verify<{ pid: string; fp: string; exp: number }>(t ?? undefined, "pr");
  return r ? { pid: r.pid, reset: true, fp: r.fp } : null;
}
/** ลิงก์รีเซ็ตยังใช้ได้กับรหัสผ่านปัจจุบันไหม */
export const resetStillValid = (fp: string | undefined, hash: string | null | undefined) => !!fp && fp === fpOf(hash);

/** พาร์ทเนอร์ที่ล็อกอินอยู่ (null = ไม่ได้ล็อกอิน / ถูกลบ) */
export async function currentPartner(): Promise<Partner | null> {
  const s = verify<{ pid: string; exp: number }>((await cookies()).get(PARTNER_COOKIE)?.value, "ps");
  if (!s) return null;
  const p = await getPartner(s.pid).catch(() => null);
  return p && p.password_hash ? p : null;
}
