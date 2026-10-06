import { NextResponse } from "next/server";
import { checkHash, clientIp, isEmail, rateLimited } from "@/lib/customer/auth";
import { PARTNER_COOKIE, partnerCookieOptions, signPartnerSession } from "@/lib/partner/auth";
import { findPartnerLogin } from "@/lib/partner/store";

export const runtime = "nodejs";
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(b.password ?? "");
  const ip = clientIp(req);
  if (rateLimited(`plogin:${ip}`, 20) || rateLimited(`plogin:${ip}:${email}`, 8)) return bad("ลองหลายครั้งเกินไป กรุณารอ 15 นาที", 429);
  if (!isEmail(email) || !password) return bad("กรุณากรอกอีเมลและรหัสผ่าน");
  try {
    const p = await findPartnerLogin(email);
    if (!p?.password_hash || !checkHash(password, p.password_hash)) return bad("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(PARTNER_COOKIE, signPartnerSession(p.id), partnerCookieOptions);
    return res;
  } catch (e) {
    console.error("partner login", e);
    return bad("ระบบขัดข้อง กรุณาลองใหม่", 500);
  }
}
