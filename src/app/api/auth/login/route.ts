import { limited } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, checkHash, clientIp, customersEnabled, findCustomer, isEmail, sessionCookieOptions, signCustomerSession } from "@/lib/customer/auth";

export const runtime = "nodejs";
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(b.password ?? "");
  const ip = clientIp(req);
  if (await limited(`login:${ip}`, 20) || await limited(`login:${ip}:${email}`, 8)) return bad("ลองหลายครั้งเกินไป กรุณารอ 15 นาที", 429);
  if (!isEmail(email) || !password) return bad("กรุณากรอกอีเมลและรหัสผ่าน");

  let sub = `demo:${email}`;
  if (!customersEnabled()) { const fl = await (await import("@/lib/customer/admin")).memberFlags(sub).catch(() => null); if (fl?.suspended_at || fl?.deleted_at) return bad("บัญชีนี้ถูกระงับการใช้งาน · ติดต่อทีมงานทาง LINE", 403); }
  let pwHash: string | undefined;
  if (customersEnabled()) {
    try {
      const c = await findCustomer(email);
      if (!c || !checkHash(password, c.password_hash)) return bad("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
      if ((c as { suspended_at?: string | null; deleted_at?: string | null }).suspended_at || (c as { deleted_at?: string | null }).deleted_at) return bad("บัญชีนี้ถูกระงับการใช้งาน · ติดต่อทีมงานทาง LINE", 403);
      if ((c as { delete_requested_at?: string | null }).delete_requested_at) return bad("บัญชีนี้อยู่ระหว่างขอลบข้อมูล · ติดต่อทีมงานทาง LINE หากต้องการยกเลิก", 403);
      sub = c.id; pwHash = c.password_hash;
    } catch (e) {
      console.error("customer login failed", e);
      return bad("ระบบขัดข้อง กรุณาลองใหม่", 500);
    }
  }
  const res = NextResponse.json({ ok: true, demo: !customersEnabled() });
  res.cookies.set(SESSION_COOKIE, signCustomerSession(sub, email, pwHash), sessionCookieOptions);
  return res;
}
