import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { getById } from "@/lib/join/store";
import { signResume } from "@/lib/join/resume";

export const runtime = "nodejs";

// แอดมินเปิดดูหน้าโปรไฟล์แบบเดียวกับที่ผู้สมัครเห็น (26 ต.ค. 2569) — แนบโทเคนใน ?t= ไม่ตั้งคุกกี้ในเครื่องแอดมิน
// และไม่บันทึกเป็น "ผู้ออกลิงก์" (ต่างจาก /link ที่ส่งให้ผู้สมัคร ซึ่งกันคนออกลิงก์อนุมัติ KYC เอง)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s || !canAccess(s.role, "/admin/applicants")) return NextResponse.json({ ok: false }, { status: 401 });
  const row = await getById((await params).id);
  if (!row) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.redirect(new URL(`/join/profile/${row.mb_code}?t=${encodeURIComponent(signResume(row.mb_code))}`, req.url), 303);
}
