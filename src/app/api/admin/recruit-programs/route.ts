import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { getPrograms, savePrograms } from "@/lib/member/recruit-programs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// โปรแกรม Recruit แยกส่วน: GET = อ่านราคา (แอดมินที่เข้า /admin/recruit-programs ได้) · POST = แก้ราคา/เปิดปิด (CEO เท่านั้น · เรื่องเงิน)
export async function GET() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s || !canAccess(s.role, "/admin/recruit-programs")) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, programs: await getPrograms() });
}

export async function POST(req: Request) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  if (s.role !== "ceo") return NextResponse.json({ ok: false, error: "แก้ราคาได้เฉพาะ CEO" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { programs?: unknown };
  try {
    return NextResponse.json({ ok: true, programs: await savePrograms(b.programs, s.email) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" }, { status: 400 });
  }
}
