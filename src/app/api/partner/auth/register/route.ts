import { limited } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { clientIp, makeHash } from "@/lib/customer/auth";
import { PARTNER_COOKIE, partnerCookieOptions, readRegisterToken, resetStillValid, signPartnerSession } from "@/lib/partner/auth";
import { findPartnerLogin, getPartner, updatePartner } from "@/lib/partner/store";

export const runtime = "nodejs";
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

// ตั้งรหัสผ่านเข้าพอร์ทัล — token จากฟอร์มสมัคร (ตั้งครั้งแรก) หรือลิงก์รีเซ็ตที่แอดมินส่งให้ (ตั้งใหม่ได้แม้มีรหัสแล้ว · ใช้ได้ครั้งเดียว)
export async function POST(req: Request) {
  if (await limited(`preg:${clientIp(req)}`, 8, 10 * 60_000)) return bad("ส่งบ่อยเกินไป กรุณารอสักครู่", 429);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const tk = readRegisterToken(String(b.token ?? ""));
  if (!tk) return bad("ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาติดต่อทีมงาน", 401);
  const password = String(b.password ?? "");
  if (password.length < 8 || password.length > 200) return bad("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
  try {
    const p = await getPartner(tk.pid);
    if (!p) return bad("ไม่พบข้อมูลการสมัคร", 404);
    if (tk.reset ? !resetStillValid(tk.fp, p.password_hash) : !!p.password_hash)
      return bad(tk.reset ? "ลิงก์นี้ถูกใช้ไปแล้ว · ขอลิงก์ใหม่จากทีมงาน" : "บัญชีนี้ตั้งรหัสผ่านแล้ว กรุณาเข้าสู่ระบบ", 409);
    const other = await findPartnerLogin(p.email);
    if (other && other.id !== p.id) return bad("อีเมลนี้มีบัญชีพาร์ทเนอร์อยู่แล้ว", 409);
    await updatePartner(p.id, { password_hash: makeHash(password) });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(PARTNER_COOKIE, signPartnerSession(p.id), partnerCookieOptions);
    return res;
  } catch (e) {
    console.error("partner register", e);
    return bad("ระบบขัดข้อง กรุณาลองใหม่", 500);
  }
}
