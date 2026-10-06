import { NextResponse } from "next/server";
import { clientIp } from "@/lib/customer/auth";
import { normalizePhone, sendOtp } from "@/lib/otp";
import { TURNSTILE_ERROR, verifyTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";

// ขอรหัส OTP ทาง SMS — body: { phone, turnstile }
export async function POST(req: Request) {
  const ip = clientIp(req);
  const b = (await req.json().catch(() => ({}))) as { phone?: string; turnstile?: string };
  const phone = normalizePhone(String(b.phone ?? ""));
  if (!phone) return NextResponse.json({ ok: false, error: "เบอร์มือถือไม่ถูกต้อง (10 หลัก ขึ้นต้น 06/08/09)" }, { status: 400 });
  if (!(await verifyTurnstile(b.turnstile, ip))) return NextResponse.json({ ok: false, error: TURNSTILE_ERROR }, { status: 403 });
  try {
    const r = await sendOtp(phone, ip);
    if (!r.ok) return NextResponse.json({ ok: false, error: r.error, retryAfter: r.retryAfter }, { status: r.status });
    return NextResponse.json({ ok: true, dev: r.dev, devCode: r.devCode });
  } catch (e) {
    console.error("otp send", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง กรุณาลองใหม่" }, { status: 500 });
  }
}
