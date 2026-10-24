import { NextResponse } from "next/server";
import { limited as dbLimited } from "@/lib/rate-limit";
import { SALES_COOKIE, signSalesLink } from "@/lib/member";
import { findRep } from "@/lib/member/store";
import { checkSalesLogin } from "@/lib/member/recruit";
import { sameOrigin } from "@/lib/switch-confirm";

export const runtime = "nodejs";

// เข้าแดชบอร์ด Sale Man ด้วย ID / รหัสผ่านที่ทีมงานออกให้ → คุกกี้ mb_sales 30 วัน (เห็นเฉพาะข้อมูลของตัวเอง)
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (await dbLimited(`saleslogin:${ip}`, 10, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ลองบ่อยเกินไป กรุณารอ 15 นาที" }, { status: 429 });
  const b = (await req.json().catch(() => null)) as { username?: unknown; password?: unknown } | null;
  const id = await checkSalesLogin(b?.username, b?.password);
  const rep = id ? await findRep({ id }).catch(() => null) : null;
  if (!rep || rep.kind !== "external" || !rep.active) return NextResponse.json({ ok: false, error: "ID หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SALES_COOKIE, signSalesLink(rep.id, 30), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
  return res;
}
