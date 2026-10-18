import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { limited } from "@/lib/rate-limit";
import { BookingError } from "@/lib/bookings";
import { requestExtend } from "@/lib/bookings/changes";

export const runtime = "nodejs";

// ลูกค้าขอต่อเวลา +1 ชม. ระหว่างนัด → รอเพื่อนตอบ · ตัดเงินตอนเพื่อนรับ · ยอดไม่พอ = 402 + ลิงก์เติมเงิน
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (await limited(`extend:${me.sub}`, 10, 60 * 60_000)) return NextResponse.json({ ok: false, error: "ส่งบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  try {
    const c = await requestExtend((await params).id, me.sub);
    return NextResponse.json({ ok: true, change: c });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message, code: e.code, ...e.data }, { status: e.code === "notfound" ? 404 : e.code === "funds" ? 402 : 409 });
    console.error("extend", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
