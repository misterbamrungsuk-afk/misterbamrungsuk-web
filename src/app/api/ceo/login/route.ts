import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/switch-confirm";
import { CEO_COOKIE, CEO_SESSION_HOURS, checkCeoPassword, signCeoSession } from "@/lib/ceo-room-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// เข้าห้อง CEO ด้วยรหัส CEO (แยกจากรหัสแอดมิน) — จำกัดครั้งราย IP + รวมทั้งระบบ (กันเดารหัส)
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if ((await limited(`ceo:${ip}`, 8, 15 * 60_000)) || (await limited("ceo:all", 30, 30 * 60_000))) return NextResponse.json({ ok: false, error: "ลองหลายครั้งเกินไป กรุณารอ 15 นาที" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { password?: unknown };
  if (!(await checkCeoPassword(String(b.password ?? "")))) return NextResponse.json({ ok: false, error: "รหัส CEO ไม่ถูกต้อง" }, { status: 401 });
  const token = await signCeoSession();
  if (!token) return NextResponse.json({ ok: false, error: "ระบบยังไม่พร้อม" }, { status: 503 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CEO_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: CEO_SESSION_HOURS * 3600 });
  return res;
}
