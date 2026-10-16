import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { BookingError, cancelByCustomer } from "@/lib/bookings";

export const runtime = "nodejs";

// ลูกค้ายกเลิก: ก่อนเพื่อนตอบรับ = คืนเงินทันที · หลังตอบรับ = ส่งเรื่องให้ทีมงานตัดสินตามกติกา
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { reason?: string };
  try {
    const r = await cancelByCustomer((await params).id, me.sub, String(b.reason ?? ""));
    return NextResponse.json({ ok: true, status: r.status });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message }, { status: e.code === "notfound" ? 404 : 409 });
    console.error("cancel", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
