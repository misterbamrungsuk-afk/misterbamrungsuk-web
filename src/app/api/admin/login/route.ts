import { NextResponse } from "next/server";
import { ADMIN_COOKIE, SESSION_HOURS, homeFor, signSession } from "@/lib/admin-auth";
import { adminLoginEnabled, checkLogin } from "@/lib/admin-accounts";
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
  const role = checkLogin(String(body.email ?? ""), String(body.password ?? ""));
  if (!role) {
    const cur = rec && rec.until > now ? rec : { n: 0, until: now + WINDOW };
    attempts.set(ip, { n: cur.n + 1, until: cur.until });
    return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }
  attempts.delete(ip);

  const token = await signSession(String(body.email).trim().toLowerCase(), role);
  if (!token) return NextResponse.json({ error: "ยังไม่ได้ตั้ง ADMIN_SESSION_SECRET" }, { status: 503 });

  const res = NextResponse.json({ ok: true, role, home: homeFor(role) });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !req.url.startsWith("http://localhost"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return res;
}
