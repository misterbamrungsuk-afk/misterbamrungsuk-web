import { NextResponse } from "next/server";
import { getBooking } from "@/lib/bookings";
import { CallError, callActor, canCall, startCall, viewFor } from "@/lib/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?booking_id=&as=&mb=&t= → โทรได้ไหม (+ เหตุผลถ้าไม่ได้) สำหรับปุ่มโทร
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const b = await getBooking(String(sp.get("booking_id") ?? ""));
  if (!b) return NextResponse.json({ ok: false, can: false, reason: "ไม่พบนัดนี้" }, { status: 404 });
  const who = await callActor(b, { as: sp.get("as"), mb: sp.get("mb"), t: sp.get("t") });
  if (!who) return NextResponse.json({ ok: false, can: false, reason: "โทรได้เฉพาะลูกค้าและเพื่อนของนัดนี้" }, { status: 403 });
  const r = await canCall(b, who);
  return NextResponse.json({ ok: true, can: r.ok, reason: r.reason, code: r.code, opens_at: r.opens_at ?? null }, { headers: { "Cache-Control": "no-store" } });
}

// POST { booking_id, as?, mb?, t? } → เปิดสายใหม่ (สถานะ ringing) + ส่ง push ไปอีกฝั่ง
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { booking_id?: string; as?: string; mb?: string; t?: string };
  const b = await getBooking(String(body.booking_id ?? ""));
  if (!b) return NextResponse.json({ ok: false, error: "ไม่พบนัดนี้" }, { status: 404 });
  const who = await callActor(b, body);
  if (!who) return NextResponse.json({ ok: false, error: "โทรได้เฉพาะลูกค้าและเพื่อนของนัดนี้", code: "forbidden" }, { status: 403 });
  try {
    const c = await startCall(b, who);
    return NextResponse.json({ ok: true, call: viewFor(c, who, b) });
  } catch (e) {
    if (e instanceof CallError) return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: e.status });
    console.error("call start", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
