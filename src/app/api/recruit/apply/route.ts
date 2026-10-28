import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { clientIp } from "@/lib/customer/auth";
import { verifyTurnstile } from "@/lib/turnstile";
import { ApplyError, submitRecruitApp } from "@/lib/member/recruit-apply";
import { SALES_COOKIE, signSalesLink } from "@/lib/member";

export const runtime = "nodejs";

// สมัครเป็น Recruit (หน้า /recruit/apply) — เป็น Recruit ทันที + เข้าระบบอัตโนมัติ (คุกกี้ mb_sales) · ตั้งรหัสผ่านเองในแดชบอร์ด
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await limited(`rcapply:${ip}`, 5, 60 * 60_000)) return NextResponse.json({ ok: false, error: "ส่งบ่อยเกินไป ลองใหม่ภายหลัง" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!(await verifyTurnstile(b.turnstile, ip))) return NextResponse.json({ ok: false, error: "ยืนยันว่าไม่ใช่บอทไม่สำเร็จ ลองใหม่" }, { status: 400 });
  try {
    const r = await submitRecruitApp(b, ip);
    const res = NextResponse.json({ ok: true, code: r.code, username: r.username, next: "/recruit/me?welcome=1" });
    res.cookies.set(SALES_COOKIE, signSalesLink(r.repId, 30), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
    return res;
  } catch (e) {
    if (e instanceof ApplyError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("recruit apply", e);
    return NextResponse.json({ ok: false, error: "ส่งใบสมัครไม่สำเร็จ" }, { status: 500 });
  }
}
