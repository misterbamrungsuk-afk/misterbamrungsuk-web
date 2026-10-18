import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import QRCode from "qrcode";
import { ADMIN_COOKIE, SESSION_HOURS, signSession, verifySession, type AdminSession } from "@/lib/admin-auth";
import {
  auditMfa, clientIp, confirmEnroll, cookieOpts, mfaStatus, statusFor,
  newRecoveryCodes, removeMfa, setPolicy, startEnroll, verifyMfaCode,
} from "@/lib/admin-mfa";
import { limited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ตั้งค่ายืนยันตัวตน 2 ชั้นของบัญชีตัวเอง (ทุกบทบาท) + สวิตช์บังคับทั้งระบบ / ล้าง 2 ชั้นของคนอื่น (CEO)
const me = async () => verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
const err = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function GET() {
  const s = await me();
  if (!s) return err("unauthorized", 401);
  return NextResponse.json(await statusFor(s));
}

/** ออก session ใหม่ (mfa = ผ่าน 2 ชั้นแล้วหรือยัง) */
async function withSession(res: NextResponse, req: Request, s: AdminSession, mfa: boolean) {
  const t = await signSession(s.email, s.role, { mfa });
  if (t) res.cookies.set(ADMIN_COOKIE, t, cookieOpts(req, SESSION_HOURS * 3600));
  return res;
}

export async function POST(req: Request) {
  const s = await me();
  if (!s) return err("เซสชันหมดอายุ · เข้าสู่ระบบใหม่", 401);
  const b = (await req.json().catch(() => ({}))) as { action?: string; code?: string; on?: boolean; email?: string };
  const codeLimited = () => limited(`admmfa-s:${clientIp(req)}:${s.email}`, 10, 15 * 60_000);
  try {
    switch (b.action) {
      case "start": {
        const st = await mfaStatus(s.email);
        if (st.enrolled) return err("บัญชีนี้ตั้ง 2 ชั้นไว้แล้ว", 409);
        const { secret, uri } = await startEnroll(s.email);
        const qr = await QRCode.toDataURL(uri, { margin: 1, width: 240 }).catch(() => null);
        return NextResponse.json({ ok: true, secret, uri, qr });
      }
      case "confirm": {
        if (await codeLimited()) return err("ลองหลายครั้งเกินไป กรุณารอ 15 นาที", 429);
        const codes = await confirmEnroll(s.email, b.code);
        if (!codes) return err("รหัสไม่ถูกต้อง หรือหมดเวลา (เริ่มใหม่ได้)", 401);
        await auditMfa("admin_mfa_enroll", `เปิดยืนยันตัวตน 2 ชั้น: ${s.email} (${s.role})`, req);
        return withSession(NextResponse.json({ ok: true, recovery: codes }), req, s, true);
      }
      case "stepup": {
        if (await codeLimited()) return err("ลองหลายครั้งเกินไป กรุณารอ 15 นาที", 429);
        const how = await verifyMfaCode(s.email, b.code);
        if (!how) { await auditMfa("admin_mfa_fail", `รหัส 2 ชั้นไม่ถูกต้อง (ยืนยันเซสชัน): ${s.email}`, req); return err("รหัสไม่ถูกต้อง หรือใช้ไปแล้ว", 401); }
        return withSession(NextResponse.json({ ok: true }), req, s, true);
      }
      case "disable": {
        if (await codeLimited()) return err("ลองหลายครั้งเกินไป กรุณารอ 15 นาที", 429);
        const how = await verifyMfaCode(s.email, b.code);
        if (!how) { await auditMfa("admin_mfa_fail", `รหัส 2 ชั้นไม่ถูกต้อง (ปิด 2 ชั้น): ${s.email}`, req); return err("ต้องใส่รหัส 6 หลักปัจจุบัน (หรือรหัสกู้คืน) ให้ถูกต้อง", 401); }
        await removeMfa(s.email);
        await auditMfa("admin_mfa_disable", `ปิดยืนยันตัวตน 2 ชั้น: ${s.email} (${s.role})`, req);
        return withSession(NextResponse.json({ ok: true }), req, s, false);
      }
      case "recovery": {
        if (await codeLimited()) return err("ลองหลายครั้งเกินไป กรุณารอ 15 นาที", 429);
        const how = await verifyMfaCode(s.email, b.code, { allowRecovery: false });
        if (!how) return err("ต้องใส่รหัส 6 หลักจากแอปให้ถูกต้อง", 401);
        const codes = await newRecoveryCodes(s.email);
        await auditMfa("admin_mfa_recovery", `สร้างรหัสกู้คืนชุดใหม่: ${s.email}`, req);
        return NextResponse.json({ ok: true, recovery: codes });
      }
      case "enforce": {
        if (s.role !== "ceo") return err("เฉพาะ CEO", 403);
        const on = b.on === true;
        // เปิดบังคับได้เมื่อ CEO เองเข้าสู่ระบบด้วย 2 ชั้นแล้ว (กันเปิดแล้วตัวเองต้องไปตั้งค่าก่อน)
        if (on && !s.mfa) return err("ตั้งค่า 2 ชั้นของบัญชีคุณ และเข้าสู่ระบบด้วยรหัส 6 หลักก่อน จึงจะเปิดบังคับได้", 409);
        const p = await setPolicy(on, s.email);
        await auditMfa("admin_mfa_enforce", `${on ? "เปิด" : "ปิด"}บังคับ 2 ชั้นทุกบัญชีแอดมิน โดย ${s.email}`, req);
        return NextResponse.json({ ok: true, enforce: p.enforce });
      }
      case "reset": {
        // CEO ล้าง 2 ชั้นของแอดมินคนอื่น (ทำโทรศัพท์หาย/รหัสกู้คืนหมด) — CEO ต้องผ่าน 2 ชั้นแล้ว
        if (s.role !== "ceo") return err("เฉพาะ CEO", 403);
        if (!s.mfa) return err("เข้าสู่ระบบด้วยรหัส 2 ชั้นก่อน", 409);
        const email = String(b.email ?? "").trim().toLowerCase();
        if (!email || email === s.email) return err("เลือกบัญชีอื่น (บัญชีตัวเองใช้ปุ่มปิด 2 ชั้น)");
        if (!(await removeMfa(email))) return err("บัญชีนี้ยังไม่ได้ตั้ง 2 ชั้น", 404);
        await auditMfa("admin_mfa_reset", `CEO ล้าง 2 ชั้นของ ${email} โดย ${s.email}`, req);
        return NextResponse.json({ ok: true });
      }
      default:
        return err("unknown action");
    }
  } catch (e) {
    if ((e as Error).message === "already") return err("บัญชีนี้ตั้ง 2 ชั้นไว้แล้ว", 409);
    console.error("admin security", (e as Error).message);
    return err("ระบบยืนยันตัวตน 2 ชั้นขัดข้องชั่วคราว ลองใหม่อีกครั้ง", 503);
  }
}
