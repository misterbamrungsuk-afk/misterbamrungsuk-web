import { NextResponse } from "next/server";
import { currentPartner } from "@/lib/partner/auth";
import { inboxGet, inboxPost } from "@/lib/notices/inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// กล่องแจ้งเตือนพาร์ทเนอร์ (สปา/โรงแรม) · GET ?count=1 = กระดิ่ง · POST { id } / { all: true } = อ่านแล้ว
export async function GET(req: Request) {
  const p = await currentPartner();
  if (!p) return NextResponse.json({ ok: false }, { status: 401 });
  return inboxGet({ type: "partner", id: p.id }, req);
}
export async function POST(req: Request) {
  const p = await currentPartner();
  if (!p) return NextResponse.json({ ok: false }, { status: 401 });
  return inboxPost({ type: "partner", id: p.id }, req);
}
