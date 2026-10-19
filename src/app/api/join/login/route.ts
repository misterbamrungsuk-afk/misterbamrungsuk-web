import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { getByEmail, getPwHash } from "@/lib/join/store";
import { cleanEmail, linkable } from "@/lib/join/link-mail";
import { verifyPw } from "@/lib/join/pt-password";
import { RESUME_COOKIE, RESUME_TTL_MS, signResume } from "@/lib/join/resume";
import { TURNSTILE_ERROR, verifyTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";

// Part-Time เข้าสู่ระบบ (/join/me) ด้วยอีเมล + รหัสผ่านที่ตั้งตอนสมัคร → ออกคุกกี้ mb_resume ใหม่ (มี iat → ใช้ได้แม้หลังแอดมินยกเลิกลิงก์/ออกทุกเครื่อง)
// ผิดทุกกรณีตอบข้อความเดียวกัน (ไม่บอกว่าอีเมลนี้สมัครไหม)
const BAD = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (await limited(`jlogin:${ip}`, 10, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ลองบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่" }, { status: 429 });
  const b = (await req.json().catch(() => null)) as { email?: unknown; password?: unknown; turnstile?: unknown } | null;
  if (!(await verifyTurnstile(b?.turnstile, ip))) return NextResponse.json({ ok: false, error: TURNSTILE_ERROR }, { status: 403 });
  const email = cleanEmail(b?.email);
  const pw = typeof b?.password === "string" ? b.password : "";
  if (!email || !pw) return NextResponse.json({ ok: false, error: BAD }, { status: 401 });
  if (await limited(`jlogin-em:${email}`, 5, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ลองบ่อยเกินไป กรุณารอ 15 นาที หรือกด \"ลืมรหัสผ่าน\"" }, { status: 429 });

  const rows = (await getByEmail(email).catch(() => [])).filter(linkable);
  let mb: string | null = null;
  if (!rows.length) verifyPw(pw, null); // ใช้เวลาเท่ากัน
  for (const r of rows) {
    if (verifyPw(pw, await getPwHash(r.id).catch(() => null))) { mb = r.mb_code; break; }
  }
  if (!mb) { console.info("[pt-login] fail"); return NextResponse.json({ ok: false, error: BAD }, { status: 401 }); }
  console.info(`[pt-login] mb=${mb}`);
  const res = NextResponse.json({ ok: true, mb, to: `/join/profile/${mb}` });
  res.cookies.set(RESUME_COOKIE, signResume(mb), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: RESUME_TTL_MS / 1000 });
  return res;
}
