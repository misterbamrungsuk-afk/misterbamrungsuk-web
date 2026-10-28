import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { limited } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/switch-confirm";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { CEO_COOKIE, CEO_SESSION_HOURS, CeoAuthError, ceoPasswordSet, ceoSession, setCeoPassword, signCeoSession } from "@/lib/ceo-room-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ตั้งรหัส CEO: ครั้งแรก = บัญชีแอดมิน CEO ที่ล็อกอินอยู่ · เปลี่ยนรหัส = อยู่ในห้อง CEO + รหัสเดิม (session เก่าทุกเครื่องหลุด)
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (await limited(`ceopw:${ip}`, 8, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ลองหลายครั้งเกินไป กรุณารอ 15 นาที" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { password?: unknown; current?: unknown };
  const set = await ceoPasswordSet();
  let by = "ceo-room";
  if (!set) {
    const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
    if (s?.role !== "ceo") return NextResponse.json({ ok: false, error: "ตั้งรหัสครั้งแรกได้เฉพาะบัญชีแอดมิน CEO" }, { status: 403 });
    by = `admin:${s.email}`;
  } else if (!(await ceoSession())) return NextResponse.json({ ok: false, error: "กรุณาเข้าห้อง CEO ก่อน" }, { status: 401 });
  try {
    await setCeoPassword(String(b.password ?? ""), { current: b.current == null ? undefined : String(b.current), by });
  } catch (e) {
    if (e instanceof CeoAuthError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    throw e;
  }
  const token = await signCeoSession();
  const res = NextResponse.json({ ok: true });
  if (token) res.cookies.set(CEO_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: CEO_SESSION_HOURS * 3600 });
  return res;
}
