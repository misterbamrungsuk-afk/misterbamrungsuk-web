import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SALES_COOKIE, readSalesLink } from "@/lib/member";
import { findRep } from "@/lib/member/store";
import { sameOrigin, switchPage } from "@/lib/switch-confirm";

export const runtime = "nodejs";

// ลิงก์เข้าแดชบอร์ด Sale Man ภายนอก (แอดมินส่งให้) — ตรวจโทเคนแล้วจำเครื่องนี้ไว้ 90 วัน
// เครื่องนี้เข้าแดชบอร์ด Sale Man คนอื่นอยู่ = ถามยืนยันก่อนสลับ
function enter(url: URL, t: string) {
  const res = NextResponse.redirect(new URL("/sales/me", url), 303);
  res.cookies.set(SALES_COOKIE, t, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 90 * 86400 });
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const t = url.searchParams.get("t");
  const id = readSalesLink(t);
  if (!id || !t) return NextResponse.redirect(new URL("/sales?expired=1", url));
  const cur = readSalesLink((await cookies()).get(SALES_COOKIE)?.value);
  if (cur && cur !== id) {
    const [a, b] = await Promise.all([findRep({ id }).catch(() => null), findRep({ id: cur }).catch(() => null)]);
    return switchPage("/sales/go", { t }, a?.name ?? "Sale Man", b?.name ?? "Sale Man อีกคน");
  }
  return enter(url, t);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!sameOrigin(req)) return new Response("forbidden", { status: 403 });
  const t = String((await req.formData().catch(() => null))?.get("t") ?? "");
  if (!readSalesLink(t)) return NextResponse.redirect(new URL("/sales?expired=1", url), 303);
  return enter(url, t);
}
