import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { limited } from "@/lib/rate-limit";
import { BookingError } from "@/lib/bookings";
import { requestReschedule } from "@/lib/bookings/changes";

export const runtime = "nodejs";

// ลูกค้าขอเปลี่ยนเวลานัดที่ยืนยันแล้ว: { starts_at (ISO), reason? } → รอเพื่อนตอบ · 1 ครั้งต่อการจอง · ไม่มีเงินเปลี่ยน
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (await limited(`resched:${me.sub}`, 10, 60 * 60_000)) return NextResponse.json({ ok: false, error: "ส่งบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { starts_at?: string; reason?: string };
  try {
    const c = await requestReschedule((await params).id, me.sub, String(b.starts_at ?? ""), String(b.reason ?? ""));
    return NextResponse.json({ ok: true, change: c });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: e.code === "notfound" ? 404 : 409 });
    console.error("reschedule", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
