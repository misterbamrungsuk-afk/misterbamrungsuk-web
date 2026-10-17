import { NextResponse } from "next/server";
import { currentParttime } from "@/lib/bookings/auth";
import { listNotices, markNoticesRead } from "@/lib/bookings";
import { ptNoticeHref } from "@/lib/join/pt-ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// กล่องแจ้งเตือนของ Part-Time (notify user_type=parttime, user_id=id ใบสมัคร)
// GET ?mb=&t=[&count=1] → { unread, notices[] } (ลิงก์แปลงเป็นหน้าของ Part-Time แล้ว) · POST { mb, t } = อ่านแล้วทั้งหมด
export async function GET(req: Request) {
  const u = new URL(req.url);
  const t = u.searchParams.get("t");
  const a = await currentParttime(u.searchParams.get("mb") ?? "", t);
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  const rows = await listNotices("parttime", a.id).catch(() => []);
  const unread = rows.filter((n) => !n.read_at).length;
  if (u.searchParams.get("count") === "1") return NextResponse.json({ ok: true, unread });
  return NextResponse.json({ ok: true, unread, notices: rows.map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, href: ptNoticeHref(a.mb_code, t ?? "", n.url), read: !!n.read_at, created_at: n.created_at })) });
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { mb?: string; t?: string };
  const a = await currentParttime(String(b.mb ?? ""), b.t || null);
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  await markNoticesRead("parttime", a.id);
  return NextResponse.json({ ok: true, unread: 0 });
}
