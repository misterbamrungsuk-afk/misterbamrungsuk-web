import { NextResponse } from "next/server";
import { currentParttime } from "@/lib/bookings/auth";
import { BookingError, respond } from "@/lib/bookings";
import { checkIn, ptDone } from "@/lib/bookings/day";

export const runtime = "nodejs";

// Part-Time จัดการงาน: { mb, t?, action: "accept" | "decline" | "checkin" | "done", reason? }
// (รองรับรูปแบบเดิม { accept: boolean } ด้วย)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const b = (await req.json().catch(() => ({}))) as { mb?: string; t?: string; accept?: boolean; action?: string; reason?: string; gps?: { lat?: number; lng?: number; accuracy?: number; error?: string } };
  const a = await currentParttime(String(b.mb ?? ""), b.t);
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  const id = (await params).id;
  const action = b.action ?? (b.accept === true ? "accept" : "decline");
  try {
    const r = action === "checkin" ? await checkIn(id, a.id, b.gps)
      : action === "done" ? await ptDone(id, a.id)
      : await respond(id, a.id, action === "accept", String(b.reason ?? ""));
    return NextResponse.json({ ok: true, status: r?.status });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message }, { status: e.code === "notfound" ? 404 : 409 });
    console.error("pt booking action", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
