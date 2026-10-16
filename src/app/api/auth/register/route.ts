import { limited } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, clientIp, customersEnabled, findCustomer, insertCustomer, isEmail, sessionCookieOptions, setCustomerPhone, signCustomerSession } from "@/lib/customer/auth";

import { cookies } from "next/headers";
import { PHONE_COOKIE, normalizePhone, readPhoneToken } from "@/lib/otp";

export const runtime = "nodejs";
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  if (await limited(`reg:${clientIp(req)}`, 5, 10 * 60_000)) return bad("ส่งบ่อยเกินไป กรุณารอสักครู่", 429);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(b.name ?? "").trim().slice(0, 100);
  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(b.password ?? "");
  if (!name) return bad("กรุณากรอกชื่อ");
  if (!isEmail(email)) return bad("อีเมลไม่ถูกต้อง");
  if (password.length < 8 || password.length > 200) return bad("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
  const phone = normalizePhone(String(b.phone ?? ""));
  if (!phone || readPhoneToken((await cookies()).get(PHONE_COOKIE)?.value) !== phone) return bad("กรุณายืนยันเบอร์มือถือด้วยรหัส OTP");
  if (b.accept_terms !== true) return bad("กรุณายอมรับเงื่อนไขการใช้งาน");

  let sub = `demo:${email}`;
  let pwHash: string | undefined;
  if (customersEnabled()) {
    try {
      if (await findCustomer(email)) return bad("อีเมลนี้มีบัญชีอยู่แล้ว", 409);
      const c = await insertCustomer(email, name, password);
      if (!c) return bad("อีเมลนี้มีบัญชีอยู่แล้ว", 409);
      sub = c.id; pwHash = c.password_hash;
      await setCustomerPhone(c.id, phone).catch((e) => console.error("customer phone", e));
    } catch (e) {
      console.error("customer register failed", e);
      return bad("ระบบขัดข้อง กรุณาลองใหม่", 500);
    }
  }
  const res = NextResponse.json({ ok: true, demo: !customersEnabled() });
  res.cookies.delete(PHONE_COOKIE);
  res.cookies.set(SESSION_COOKIE, signCustomerSession(sub, email, pwHash), sessionCookieOptions);
  return res;
}
