import { NextResponse } from "next/server";
import { RECRUIT_COOKIE, recruitRep } from "@/lib/member/recruit";

export const runtime = "nodejs";

// ลิงก์ชวน Part-Time ของ Recruit: /join/s/<โค้ด> (?g=tom = หน้าทอมหล่อ) → จำโค้ดไว้ 30 วัน แล้วไปหน้ารับสมัคร · โค้ดใช้ไม่ได้ = ไปหน้ารับสมัครเฉย ๆ
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const url = new URL(req.url);
  const rep = await recruitRep((await params).code);
  const res = NextResponse.redirect(new URL(url.searchParams.get("g") === "tom" ? "/join/tom" : "/join", url), 303);
  if (rep) res.cookies.set(RECRUIT_COOKIE, rep.code, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
  return res;
}
