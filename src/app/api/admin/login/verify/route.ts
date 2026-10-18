import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, ADMIN_MFA_PENDING_COOKIE, SESSION_HOURS, homeFor, signSession, verifyMfaPending } from "@/lib/admin-auth";
import { auditMfa, clientIp, cookieOpts, verifyMfaCode } from "@/lib/admin-mfa";
import { limited } from "@/lib/rate-limit";

export const runtime = "nodejs";

// ขั้นที่ 2 ของการเข้าสู่ระบบ: รหัส 6 หลักจากแอป หรือรหัสกู้คืน → ออก session (mfa: true)
export async function POST(req: Request) {
  const p = await verifyMfaPending((await cookies()).get(ADMIN_MFA_PENDING_COOKIE)?.value);
  if (!p) return NextResponse.json({ error: "หมดเวลายืนยัน (5 นาที) กรุณาเข้าสู่ระบบใหม่", restart: true }, { status: 401 });
  const ip = clientIp(req);
  // 5 ครั้ง / 15 นาที ต่อบัญชี+IP · 15 ครั้ง / 15 นาที ต่อบัญชี (ทุก IP รวมกัน)
  if ((await limited(`admmfa:${ip}:${p.email}`, 5, 15 * 60_000)) || (await limited(`admmfa:${p.email}`, 15, 15 * 60_000))) {
    await auditMfa("admin_mfa_fail", `ใส่รหัส 2 ชั้นผิดหลายครั้ง (ถูกพัก 15 นาที): ${p.email}`, req);
    return NextResponse.json({ error: "ลองหลายครั้งเกินไป กรุณารอ 15 นาที" }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as { code?: string };
  let how: "totp" | "recovery" | null = null;
  try { how = await verifyMfaCode(p.email, body.code); }
  catch (e) {
    console.error("admin 2fa verify", (e as Error).message);
    return NextResponse.json({ error: "ระบบยืนยันตัวตน 2 ชั้นขัดข้องชั่วคราว ลองใหม่อีกครั้ง" }, { status: 503 });
  }
  if (!how) {
    await auditMfa("admin_mfa_fail", `รหัส 2 ชั้นไม่ถูกต้อง: ${p.email} (${p.role})`, req);
    return NextResponse.json({ error: "รหัสไม่ถูกต้อง หรือใช้ไปแล้ว" }, { status: 401 });
  }
  const token = await signSession(p.email, p.role, { mfa: true });
  if (!token) return NextResponse.json({ error: "ยังไม่ได้ตั้ง ADMIN_SESSION_SECRET" }, { status: 503 });
  await auditMfa("admin_login", `เข้าสู่ระบบแอดมิน (2 ชั้น${how === "recovery" ? " · ใช้รหัสกู้คืน" : ""}): ${p.email} (${p.role})`, req);
  const res = NextResponse.json({ ok: true, role: p.role, home: homeFor(p.role), recovery: how === "recovery" });
  res.cookies.set(ADMIN_COOKIE, token, cookieOpts(req, SESSION_HOURS * 3600));
  res.cookies.set(ADMIN_MFA_PENDING_COOKIE, "", cookieOpts(req, 0));
  return res;
}
