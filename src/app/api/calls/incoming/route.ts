import { NextResponse } from "next/server";
import { incomingActor, incomingFor } from "@/lib/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?as=&mb=&t= → สายเรียกเข้าที่ยังดังอยู่ (หน้าจอถามทุก 4 วิเฉพาะตอนเปิดหน้าอยู่)
// เบา: อ่านเฉพาะแถว ringing ของผู้ใช้ (index booking_calls_callee_ringing) + จำผลไว้ 2 วิต่อผู้ใช้ (ใน incomingFor)
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const me = await incomingActor({ as: sp.get("as"), mb: sp.get("mb"), t: sp.get("t") });
  if (!me) return NextResponse.json({ ok: true, calls: [], guest: true }, { headers: { "Cache-Control": "private, no-store" } });
  const calls = await incomingFor(me.side, me.id).catch((e) => { console.error("call incoming", e); return []; });
  return NextResponse.json({ ok: true, calls }, { headers: { "Cache-Control": "private, no-store" } });
}
