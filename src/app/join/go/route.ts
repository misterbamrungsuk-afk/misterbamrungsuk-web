import { NextResponse } from "next/server";
import { RESUME_COOKIE, RESUME_TTL_MS, readResume } from "@/lib/join/resume";

export const runtime = "nodejs";

// ลิงก์เข้าโปรไฟล์ที่แอดมินส่งให้ (#35) — ตรวจโทเคนแล้วตั้งคุกกี้ mb_resume ให้เครื่องนี้ จากนั้นพาไปโปรไฟล์ (ไม่ต้องพก ?t= ทุกหน้า)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const t = url.searchParams.get("t");
  const mb = readResume(t);
  if (!mb || !t) return NextResponse.redirect(new URL("/join/go/expired", url));
  const to = url.searchParams.get("to") === "rejected" ? `/join/rejected/${mb}` : `/join/profile/${mb}`;
  const res = NextResponse.redirect(new URL(to, url));
  res.cookies.set(RESUME_COOKIE, t, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: RESUME_TTL_MS / 1000 });
  return res;
}
