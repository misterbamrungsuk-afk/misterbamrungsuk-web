import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { PostError, closePost } from "@/lib/posts";

export const runtime = "nodejs";

// ปิดโพสต์ของฉัน
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    await closePost((await params).id, me.sub);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PostError) return NextResponse.json({ ok: false, error: e.message }, { status: 404 });
    console.error("post close", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
