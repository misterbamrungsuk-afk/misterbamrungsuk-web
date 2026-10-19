import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { RESUME_COOKIE, RESUME_TTL_MS, liveResume, signResume } from "@/lib/join/resume";

export const runtime = "nodejs";

// ต่ออายุคุกกี้เข้าโปรไฟล์ Part-Time แบบเลื่อน (sliding) — เดิมคุกกี้หมดอายุตายตัว 30 วันหลังสมัคร → Part-Time ที่ใช้งานทุกวันโดนเด้งออก
// ต่อให้เฉพาะคุกกี้ที่ยังใช้ได้จริง (ลายเซ็นถูก · ไม่หมดอายุ · ไม่ถูก "ออกจากระบบทุกเครื่อง"/แอดมินยกเลิก) และออกมาแล้วเกิน 1 วัน
const RENEW_AFTER_MS = 24 * 3600_000;

export async function POST() {
  const tok = (await cookies()).get(RESUME_COOKIE)?.value;
  const mb = await liveResume(tok);
  if (!mb || !tok) return NextResponse.json({ ok: false });
  let iat = 0;
  try { const p = JSON.parse(Buffer.from(tok.split(".")[0], "base64url").toString()) as { iat?: number; exp: number }; iat = p.iat ?? p.exp - RESUME_TTL_MS; } catch {}
  if (Date.now() - iat < RENEW_AFTER_MS) return NextResponse.json({ ok: true, renewed: false });
  const res = NextResponse.json({ ok: true, renewed: true });
  res.cookies.set(RESUME_COOKIE, signResume(mb), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: RESUME_TTL_MS / 1000 });
  return res;
}
