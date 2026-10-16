import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { extraOf, getById } from "@/lib/join/store";
import { signResume } from "@/lib/join/resume";

export const runtime = "nodejs";

// แอดมินสร้างลิงก์เข้าโปรไฟล์ให้ผู้สมัคร (#35) — อายุ 30 วัน · เปิดแล้วตั้งคุกกี้ให้เครื่องใหม่ผ่าน /join/go
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s || (!canAccess(s.role, "/admin/applicants") && !canAccess(s.role, "/admin/kyc"))) return NextResponse.json({ ok: false }, { status: 401 });
  const row = await getById((await params).id);
  if (!row) return NextResponse.json({ ok: false }, { status: 404 });
  const x = extraOf(row);
  const fix = x.kyc_status === "rejected" && Object.keys(x.kyc_reason ?? {}).length > 0;
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const url = `${base}/join/go?t=${encodeURIComponent(signResume(row.mb_code))}${fix ? "&to=rejected" : ""}`;
  return NextResponse.json({ ok: true, url, fix, mb: row.mb_code, nickname: row.nickname });
}
