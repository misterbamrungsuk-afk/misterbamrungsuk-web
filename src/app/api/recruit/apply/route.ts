import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { clientIp } from "@/lib/customer/auth";
import { verifyTurnstile } from "@/lib/turnstile";
import { ApplyError, submitRecruitApp } from "@/lib/member/recruit-apply";

export const runtime = "nodejs";

// สมัครเป็น Recruit (หน้า /recruit/apply) — รอแอดมินอนุมัติแล้วออก ID/รหัสผ่านให้
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await limited(`rcapply:${ip}`, 5, 60 * 60_000)) return NextResponse.json({ ok: false, error: "ส่งบ่อยเกินไป ลองใหม่ภายหลัง" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!(await verifyTurnstile(b.turnstile, ip))) return NextResponse.json({ ok: false, error: "ยืนยันว่าไม่ใช่บอทไม่สำเร็จ ลองใหม่" }, { status: 400 });
  try {
    await submitRecruitApp(b, ip);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ApplyError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("recruit apply", e);
    return NextResponse.json({ ok: false, error: "ส่งใบสมัครไม่สำเร็จ" }, { status: 500 });
  }
}
