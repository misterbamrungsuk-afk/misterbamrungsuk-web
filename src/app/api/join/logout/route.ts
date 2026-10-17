import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { RESUME_COOKIE, readResume } from "@/lib/join/resume";
import { getByMb, saveProfile } from "@/lib/join/store";

export const runtime = "nodejs";

// ออกจากระบบหน้าโปรไฟล์ผู้สมัคร (ลบ cookie mb_resume) · { all: true } = ออกทุกเครื่อง (ลิงก์/คุกกี้เดิมทั้งหมดใช้ไม่ได้ ต้องขอลิงก์ใหม่จากทีมงาน)
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { all?: boolean };
  if (b.all) {
    const mb = readResume((await cookies()).get(RESUME_COOKIE)?.value);
    const row = mb ? await getByMb(mb).catch(() => null) : null;
    if (row) await saveProfile(row.id, { tokens_after: new Date().toISOString() });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(RESUME_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return res;
}
