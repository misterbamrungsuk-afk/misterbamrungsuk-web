import { NextResponse } from "next/server";
import { currentParttime } from "@/lib/bookings/auth";
import { BookingError, respond } from "@/lib/bookings";

export const runtime = "nodejs";

// Part-Time ตอบรับ / ปฏิเสธงาน: { mb, t?, accept: boolean, reason? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const b = (await req.json().catch(() => ({}))) as { mb?: string; t?: string; accept?: boolean; reason?: string };
  const a = await currentParttime(String(b.mb ?? ""), b.t);
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  try {
    const r = await respond((await params).id, a.id, b.accept === true, String(b.reason ?? ""));
    return NextResponse.json({ ok: true, status: r.status });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message }, { status: e.code === "notfound" ? 404 : 409 });
    console.error("respond", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
