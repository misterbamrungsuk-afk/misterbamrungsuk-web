import { NextResponse } from "next/server";
import { SALES_COOKIE, readSalesLink } from "@/lib/member";

export const runtime = "nodejs";

// ลิงก์เข้าแดชบอร์ด Sale Man ภายนอก (แอดมินส่งให้) — ตรวจโทเคนแล้วจำเครื่องนี้ไว้ 90 วัน
export async function GET(req: Request) {
  const url = new URL(req.url);
  const t = url.searchParams.get("t");
  if (!readSalesLink(t)) return NextResponse.redirect(new URL("/sales?expired=1", url));
  const res = NextResponse.redirect(new URL("/sales/me", url));
  res.cookies.set(SALES_COOKIE, t!, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 90 * 86400 });
  return res;
}
