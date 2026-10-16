import { NextResponse } from "next/server";
import { currentPartner } from "@/lib/partner/auth";
import { actOnBooking } from "@/lib/partner/portal";

export const runtime = "nodejs";

// พาร์ทเนอร์ยืนยันการจอง (พร้อมจัดห้อง) หรือแจ้งห้องเต็ม
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await currentPartner();
  if (!p) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = b.action === "confirm" ? "confirmed" : b.action === "full" ? "full" : null;
  if (!action) return NextResponse.json({ ok: false, error: "action" }, { status: 400 });
  const room = String(b.room ?? "").trim().slice(0, 60);
  if (action === "confirmed" && !room) return NextResponse.json({ ok: false, error: "เลือกห้องก่อนยืนยัน" }, { status: 400 });
  try {
    const row = await actOnBooking(p.id, id, action, room || null);
    if (row) await import("@/lib/bookings").then((m) => m.spaRoomUpdate(row.booking_ref, action, row.room)).catch((e) => console.error("spa notify", e));
    return row ? NextResponse.json({ ok: true, row }) : NextResponse.json({ ok: false, error: "ไม่พบรายการ หรือสถานะเปลี่ยนไปแล้ว" }, { status: 404 });
  } catch (e) {
    console.error("booking action", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
