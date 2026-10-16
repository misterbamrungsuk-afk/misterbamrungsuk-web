import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { listAdminNotices, markAdminNoticeRead } from "@/lib/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function admin() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return s && canAccess(s.role, "/admin/audit") ? s : null;
}

// แจ้งเตือนของแอดมิน: GET = รายการล่าสุด · POST { id | "all" } = รับเรื่องแล้ว
export async function GET() {
  if (!(await admin())) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, items: await listAdminNotices(200).catch(() => []) });
}
export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: number | "all" };
  const id = b.id === "all" ? "all" : Number(b.id);
  if (id !== "all" && !Number.isInteger(id)) return NextResponse.json({ ok: false, error: "id" }, { status: 400 });
  await markAdminNoticeRead(id);
  return NextResponse.json({ ok: true });
}
