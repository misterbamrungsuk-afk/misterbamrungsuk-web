import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { currentCustomer } from "@/lib/customer/auth";
import { PostError, createPost } from "@/lib/posts";

export const runtime = "nodejs";

// ลูกค้าโพสต์หาเพื่อน: { activity, starts_at, hours, area, note }
export async function POST(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (await limited(`post:${me.sub}`, 10, 60 * 60_000)) return NextResponse.json({ ok: false, error: "โพสต์บ่อยเกินไป" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const p = await createPost(me.sub, { activity: String(b.activity ?? ""), starts_at: String(b.starts_at ?? ""), hours: Number(b.hours), area: String(b.area ?? ""), note: String(b.note ?? "") });
    return NextResponse.json({ ok: true, id: p.id });
  } catch (e) {
    if (e instanceof PostError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("post create", e);
    return NextResponse.json({ ok: false, error: "ระบบโพสต์ยังไม่เปิดใช้งาน" }, { status: 503 });
  }
}
