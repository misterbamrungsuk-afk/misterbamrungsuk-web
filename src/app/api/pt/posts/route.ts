import { NextResponse } from "next/server";
import { currentParttime } from "@/lib/bookings/auth";
import { PostError, addInterest, interestsFor, listOpen } from "@/lib/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Part-Time ดูโพสต์หาเพื่อนที่เปิดอยู่ (?mb=&t=) — ไม่ส่งรหัสลูกค้า
export async function GET(req: Request) {
  const u = new URL(req.url);
  const a = await currentParttime(u.searchParams.get("mb") ?? "", u.searchParams.get("t"));
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  try {
    const posts = await listOpen();
    const mine = new Set((await interestsFor(posts.map((p) => p.id))).filter((i) => i.parttime_id === a.id).map((i) => i.post_id));
    return NextResponse.json({ ok: true, posts: posts.map((p) => ({ id: p.id, activity: p.activity, starts_at: p.starts_at, hours: p.hours, area: p.area, note: p.note, expires_at: p.expires_at, interested: mine.has(p.id) })) });
  } catch { return NextResponse.json({ ok: true, posts: [] }); }
}

// กดสนใจโพสต์: { mb, t?, post_id, message? }
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { mb?: string; t?: string; post_id?: string; message?: string };
  const a = await currentParttime(String(b.mb ?? ""), b.t);
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  try {
    await addInterest(String(b.post_id ?? ""), a, String(b.message ?? ""));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PostError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("interest", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
