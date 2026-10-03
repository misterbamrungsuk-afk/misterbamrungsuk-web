import { NextResponse } from "next/server";
import { SESSION_COOKIE, checkHash, clientIp, customersEnabled, findCustomer, isEmail, rateLimited, sessionCookieOptions, signCustomerSession } from "@/lib/customer/auth";

export const runtime = "nodejs";
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(b.password ?? "");
  const ip = clientIp(req);
  if (rateLimited(`login:${ip}`, 20) || rateLimited(`login:${ip}:${email}`, 8)) return bad("ลองหลายครั้งเกินไป กรุณารอ 15 นาที", 429);
  if (!isEmail(email) || !password) return bad("กรุณากรอกอีเมลและรหัสผ่าน");

  let sub = `demo:${email}`;
  if (customersEnabled()) {
    try {
      const c = await findCustomer(email);
      if (!c || !checkHash(password, c.password_hash)) return bad("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
      sub = c.id;
    } catch (e) {
      console.error("customer login failed", e);
      return bad("ระบบขัดข้อง กรุณาลองใหม่", 500);
    }
  }
  const res = NextResponse.json({ ok: true, demo: !customersEnabled() });
  res.cookies.set(SESSION_COOKIE, signCustomerSession(sub, email), sessionCookieOptions);
  return res;
}
