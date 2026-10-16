import { sessionSecret } from "@/lib/session-secret";
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getAccount, listVendors } from "./store";
import type { Vendor, VendorAccount } from "./config";

// เซสชันร้านค้า (vendor portal /vendor) — แบบเดียวกับ src/lib/partner/auth.ts
// cookie mb_vendor (httpOnly, SameSite=Lax) ลงลายเซ็น HMAC · รหัสผ่าน scrypt (makeHash/checkHash จาก customer/auth)
export const VENDOR_COOKIE = "mb_vendor";
const DAYS = 30;
const secret = () => sessionSecret();

function sign(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${createHmac("sha256", secret()).update(`vendor:${body}`).digest("base64url")}`;
}
function verify<T extends { exp: number }>(token: string | undefined | null, kind: string): T | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const want = Buffer.from(createHmac("sha256", secret()).update(`vendor:${body}`).digest("base64url"));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { k?: string };
    return p.k === kind && p.exp > Date.now() ? p : null;
  } catch { return null; }
}

export const signVendorSession = (aid: string) => sign({ k: "vs", aid, exp: Date.now() + DAYS * 86400_000 });
export const vendorCookieOptions = {
  httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: DAYS * 86400,
};
/** ลิงก์เชิญ (แอดมินสร้าง) — ตั้งรหัสผ่านครั้งแรก/รีเซ็ต อายุ 7 วัน; ผูกกับ invited_at เพื่อให้ลิงก์เก่าใช้ไม่ได้เมื่อเชิญใหม่ */
export const signInvite = (a: VendorAccount) => sign({ k: "vi", aid: a.id, at: a.invited_at, exp: Date.now() + 7 * 86400_000 });
export async function readInvite(t: string | null | undefined): Promise<VendorAccount | null> {
  const p = verify<{ aid: string; at: string; exp: number }>(t, "vi");
  if (!p) return null;
  const a = await getAccount(p.aid);
  return a && a.invited_at === p.at ? a : null;
}

/** ร้านที่ล็อกอินอยู่ (null = ไม่ได้ล็อกอิน / บัญชีถูกลบ) */
export async function currentVendor(): Promise<{ account: VendorAccount; vendor: Vendor } | null> {
  const s = verify<{ aid: string; exp: number }>((await cookies()).get(VENDOR_COOKIE)?.value, "vs");
  if (!s) return null;
  const account = await getAccount(s.aid).catch(() => null);
  if (!account?.password_hash) return null;
  const vendor = (await listVendors()).find((v) => v.id === account.vendor_id);
  return vendor ? { account, vendor } : null;
}
