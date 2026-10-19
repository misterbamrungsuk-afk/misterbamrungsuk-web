import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { canResume } from "@/lib/join/resume";
import { getByMb } from "@/lib/join/store";
import { cleanEmail, emailProfileLink, maskEmail, profileLink } from "@/lib/join/link-mail";

export const runtime = "nodejs";

// การ์ด "บันทึกลิงก์เข้าโปรไฟล์" (ป๊อปอัปหลังจ่าย + หน้าหลัก Part-Time) — เจ้าของโปรไฟล์เท่านั้น (คุกกี้ mb_resume หรือ ?t=)
// GET  = ออกลิงก์ใหม่ (อายุ 30 วัน) ไว้คัดลอก / ส่งเข้า LINE ตัวเอง + อีเมลที่ใช้สมัครแบบซ่อนบางส่วน
// POST = ส่งลิงก์ไปอีเมลที่ใช้สมัครอีกครั้ง (3 ครั้ง/ชม. ต่อคน)
async function owner(mb: string, t: string | null | undefined) {
  if (!/^MB-\d{7,}$/.test(mb) || !(await canResume(mb, t))) return null;
  return getByMb(mb);
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const row = await owner(u.searchParams.get("mb") ?? "", u.searchParams.get("t"));
  if (!row) return NextResponse.json({ ok: false }, { status: 401 });
  const e = cleanEmail(row.email);
  return NextResponse.json({ ok: true, url: profileLink(req, row.mb_code), email: e ? maskEmail(e) : "" }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { mb?: string; t?: string } | null;
  const row = await owner(String(b?.mb ?? ""), b?.t);
  if (!row) return NextResponse.json({ ok: false, error: "ไม่มีสิทธิ์เข้าโปรไฟล์นี้" }, { status: 401 });
  const e = cleanEmail(row.email);
  if (!e) return NextResponse.json({ ok: false, error: "ใบสมัครนี้ยังไม่มีอีเมล · ขอลิงก์ใหม่ทาง LINE ได้" }, { status: 400 });
  if (await limited(`jlinkmail:${row.mb_code}`, 3, 3600_000)) return NextResponse.json({ ok: false, error: "ส่งไปแล้วหลายครั้ง กรุณารอ 1 ชั่วโมงแล้วลองใหม่ · ตรวจกล่องสแปมด้วย" }, { status: 429 });
  await emailProfileLink(req, row, "ลิงก์เข้าโปรไฟล์ Part-Time ที่คุณขอส่งซ้ำ กดปุ่มด้านล่างเพื่อเข้าโปรไฟล์");
  console.info(`[link-resend] mb=${row.mb_code}`);
  return NextResponse.json({ ok: true, email: maskEmail(e) });
}
