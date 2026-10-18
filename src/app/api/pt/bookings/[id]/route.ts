import { NextResponse } from "next/server";
import { currentParttime } from "@/lib/bookings/auth";
import { BookingError, respond } from "@/lib/bookings";
import { checkIn, ptDone } from "@/lib/bookings/day";
import { respondExtend, respondReschedule } from "@/lib/bookings/changes";

export const runtime = "nodejs";

// Part-Time จัดการงาน: { mb, t?, action: "accept" | "decline" | "checkin" | "done" | "reschedule_accept" | "reschedule_decline" | "extend_accept" | "extend_decline", reason? }
// (รองรับรูปแบบเดิม { accept: boolean } ด้วย)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const b = (await req.json().catch(() => ({}))) as { mb?: string; t?: string; accept?: boolean; action?: string; reason?: string; gps?: { lat?: number; lng?: number; accuracy?: number; error?: string } };
  const a = await currentParttime(String(b.mb ?? ""), b.t);
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  const id = (await params).id;
  const action = b.action ?? (b.accept === true ? "accept" : "decline");
  const reason = String(b.reason ?? "");
  try {
    const r = action === "checkin" ? await checkIn(id, a.id, b.gps)
      : action === "done" ? await ptDone(id, a.id)
      : action === "reschedule_accept" || action === "reschedule_decline" ? await respondReschedule(id, a.id, action === "reschedule_accept", reason)
      : action === "extend_accept" || action === "extend_decline" ? await respondExtend(id, a.id, action === "extend_accept", reason)
      : await respond(id, a.id, action === "accept", reason);
    return NextResponse.json({ ok: true, status: r?.status, starts_at: r?.starts_at, price_satang: r?.price_satang });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: e.code === "notfound" ? 404 : 409 });
    console.error("pt booking action", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
