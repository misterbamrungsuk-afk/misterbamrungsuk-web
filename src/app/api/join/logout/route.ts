import { NextResponse } from "next/server";
import { RESUME_COOKIE } from "@/lib/join/resume";

export const runtime = "nodejs";

// ออกจากระบบหน้าโปรไฟล์ผู้สมัคร (ลบ cookie mb_resume) — กลับเข้ามาได้จากลิงก์ที่มี ?t= หรือแอดมินส่งให้
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(RESUME_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return res;
}
