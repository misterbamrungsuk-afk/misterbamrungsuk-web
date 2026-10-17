import { NextResponse } from "next/server";
import { SALES_COOKIE } from "@/lib/member";
import { sameOrigin } from "@/lib/switch-confirm";

export const runtime = "nodejs";

// ออกจากแดชบอร์ด Sale Man บนเครื่องนี้ — ลบ cookie mb_sales (เข้าใหม่ด้วยลิงก์จากทีมงาน)
// form POST จาก /sales/me → กลับหน้า /sales · fetch (Accept json) → { ok }
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("forbidden", { status: 403 });
  const json = (req.headers.get("accept") ?? "").includes("application/json");
  const res = json ? NextResponse.json({ ok: true }) : NextResponse.redirect(new URL("/sales?out=1", req.url), 303);
  res.cookies.set(SALES_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return res;
}
