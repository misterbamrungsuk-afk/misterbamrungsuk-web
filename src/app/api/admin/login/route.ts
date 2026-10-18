import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_MFA_PENDING_COOKIE, MFA_PENDING_MINUTES, SESSION_HOURS, homeFor, signMfaPending, signSession } from "@/lib/admin-auth";
import { adminLoginEnabled, checkLogin } from "@/lib/admin-accounts";
import { cookieOpts, loginNeedsMfa, mfaEnforced } from "@/lib/admin-mfa";
import { limited } from "@/lib/rate-limit";

export const runtime = "nodejs";

// กันเดารหัส: 5 ครั้งต่อ 10 นาที ต่อ IP (in-memory — หลายเครื่องควรย้ายไป Redis/DB)
const attempts = new Map<string, { n: number; until: number }>();
const MAX = 5;
const WINDOW = 10 * 60_000;

export async function POST(req: Request) {
  if (!adminLoginEnabled()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่าบัญชีแอดมิน (ADMIN_ACCOUNTS)" }, { status: 503 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  // นับรวมทุกเซิร์ฟเวอร์ (ฐานข้อมูล): ลองได้ 12 ครั้ง / 10 นาที / IP — ชั้นในหน่วยความจำด้านล่างยังนับเฉพาะครั้งที่ผิด
  if (await limited(`adm:${ip}`, 12, WINDOW)) return NextResponse.json({ error: "ลองหลายครั้งเกินไป กรุณารอ 10 นาที" }, { status: 429 });
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && rec.until > now && rec.n >= MAX) {
    return NextResponse.json({ error: "ลองผิดหลายครั้งเกินไป กรุณารอ 10 นาที" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  // ต่อบัญชี (ทุก IP รวมกัน) — กันสุ่มรหัสบัญชีเดียวจากหลาย IP
  const who = String(body.email ?? "").trim().toLowerCase().slice(0, 120);
  if (who && (await limited(`adme:${who}`, 8, 30 * 60_000))) return NextResponse.json({ error: "บัญชีนี้ถูกพักการเข้าสู่ระบบชั่วคราว 30 นาที (ลองผิดหลายครั้ง)" }, { status: 429 });
  const role = checkLogin(String(body.email ?? ""), String(body.password ?? ""));
  if (!role) {
    const cur = rec && rec.until > now ? rec : { n: 0, until: now + WINDOW };
    attempts.set(ip, { n: cur.n + 1, until: cur.until });
    return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }
  attempts.delete(ip);
  const email = String(body.email).trim().toLowerCase();

  // บัญชีที่ตั้ง 2 ชั้นแล้ว: ยังไม่ออก session — ให้คุกกี้ "รอรหัส" 5 นาที แล้วไปขั้นใส่รหัส 6 หลัก (/api/admin/login/verify)
  let needMfa = false;
  try { needMfa = await loginNeedsMfa(email); }
  catch (e) {
    console.error("admin 2fa store", (e as Error).message);
    return NextResponse.json({ error: "ระบบยืนยันตัวตน 2 ชั้นขัดข้องชั่วคราว ลองใหม่อีกครั้งในอีกสักครู่" }, { status: 503 });
  }
  if (needMfa) {
    const pending = await signMfaPending(email, role);
    if (!pending) return NextResponse.json({ error: "ยังไม่ได้ตั้ง ADMIN_SESSION_SECRET" }, { status: 503 });
    const res = NextResponse.json({ ok: true, mfa: true });
    res.cookies.set(ADMIN_MFA_PENDING_COOKIE, pending, cookieOpts(req, MFA_PENDING_MINUTES * 60));
    return res;
  }

  // บันทึกทุกการเข้าสู่ระบบแอดมิน (ตรวจย้อนหลัง / เห็นทันทีถ้ามีคนแปลกหน้าเข้า)
  await import("@/lib/bookings").then((m) => m.notify({ user_type: "admin", user_id: "ceo", kind: "admin_login", title: `เข้าสู่ระบบแอดมิน: ${who} (${role})`, body: `IP ${ip} · ${(req.headers.get("user-agent") ?? "").slice(0, 120)}`, url: "/admin/audit" })).catch(() => {});

  const token = await signSession(email, role);
  if (!token) return NextResponse.json({ error: "ยังไม่ได้ตั้ง ADMIN_SESSION_SECRET" }, { status: 503 });

  // เปิดบังคับ 2 ชั้นอยู่ + บัญชีนี้ยังไม่ตั้ง → พาไปหน้าตั้งค่าก่อน (อ่านนโยบายไม่ได้ = ไม่บังคับ)
  const enroll = await mfaEnforced().catch(() => false);
  const res = NextResponse.json({ ok: true, role, home: enroll ? "/admin/security" : homeFor(role), enroll });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !req.url.startsWith("http://localhost"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return res;
}
