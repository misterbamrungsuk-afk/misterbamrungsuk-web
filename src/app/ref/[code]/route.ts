import { NextResponse } from "next/server";

export const runtime = "nodejs";

// ลิงก์แนะนำของ Recruit: /ref/CODE → จำโค้ด 30 วัน แล้วพาไปหน้าโปรเมมเบอร์ (โค้ดจะกรอกให้อัตโนมัติตอนเปิดเมม)
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const res = NextResponse.redirect(new URL(`/membership${code ? `?ref=${code}` : ""}`, req.url));
  if (code) res.cookies.set("mb_ref", code, { httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
  return res;
}
