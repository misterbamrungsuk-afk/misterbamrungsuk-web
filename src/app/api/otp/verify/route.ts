import { NextResponse } from "next/server";
import { clientIp, rateLimited } from "@/lib/customer/auth";
import { PHONE_COOKIE, PHONE_TOKEN_MS, normalizePhone, readPhoneToken, otpRequired, signPhoneToken, verifyOtp } from "@/lib/otp";

export const runtime = "nodejs";

// ตรวจรหัส OTP — สำเร็จแล้วตั้ง cookie ยืนยันเบอร์ (30 นาที) ให้ขั้นสมัครใช้
export async function POST(req: Request) {
  if (rateLimited(`otpv:${clientIp(req)}`, 20, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ลองบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { phone?: string; code?: string };
  const phone = normalizePhone(String(b.phone ?? ""));
  const code = String(b.code ?? "").replace(/\D/g, "");
  if (!phone || code.length !== 6) return NextResponse.json({ ok: false, error: "กรอกรหัส 6 หลัก" }, { status: 400 });
  try {
    const r = await verifyOtp(phone, code);
    if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  } catch (e) {
    console.error("otp verify", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง กรุณาลองใหม่" }, { status: 500 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PHONE_COOKIE, signPhoneToken(phone), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: PHONE_TOKEN_MS / 1000,
  });
  return res;
}

// เบอร์ที่ยืนยันแล้วใน session นี้ (cookie เป็น httpOnly หน้าเว็บอ่านเองไม่ได้)
export async function GET(req: Request) {
  const m = /(?:^|;\s*)mb_phone_ok=([^;]+)/.exec(req.headers.get("cookie") ?? "");
  const phone = readPhoneToken(m ? decodeURIComponent(m[1]) : undefined);
  return NextResponse.json({ ok: true, phone: phone ? `0${phone.slice(2)}` : null, required: otpRequired() });
}
