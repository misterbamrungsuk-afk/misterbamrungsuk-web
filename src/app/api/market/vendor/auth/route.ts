import { limited } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { checkHash, clientIp, makeHash } from "@/lib/customer/auth";
import { VENDOR_COOKIE, readInvite, signVendorSession, vendorCookieOptions } from "@/lib/market/vendor-auth";
import { findAccountByEmail, patchAccount } from "@/lib/market/store";

export const runtime = "nodejs";

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

// op: login {email,password} | accept {t,password} (ลิงก์เชิญจากแอดมิน) | logout
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { op?: string; email?: string; password?: string; t?: string };
  if (b.op === "logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(VENDOR_COOKIE, "", { ...vendorCookieOptions, maxAge: 0 });
    return res;
  }
  if (await limited(`mkv:${clientIp(req)}`, 10, 15 * 60_000)) return bad("ลองบ่อยเกินไป กรุณารอสักครู่", 429);
  const password = String(b.password ?? "");
  let accountId = "";
  if (b.op === "accept") {
    const a = await readInvite(b.t);
    if (!a) return bad("ลิงก์เชิญหมดอายุหรือไม่ถูกต้อง ขอลิงก์ใหม่จากทีมงาน", 401);
    if (password.length < 8) return bad("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
    await patchAccount(a.id, { password_hash: makeHash(password), invited_at: new Date().toISOString(), last_login_at: new Date().toISOString() });
    accountId = a.id;
  } else {
    const a = await findAccountByEmail(String(b.email ?? ""));
    if (!a?.password_hash || !checkHash(password, a.password_hash)) return bad("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
    await patchAccount(a.id, { last_login_at: new Date().toISOString() }).catch(() => {});
    accountId = a.id;
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VENDOR_COOKIE, signVendorSession(accountId), vendorCookieOptions);
  return res;
}
