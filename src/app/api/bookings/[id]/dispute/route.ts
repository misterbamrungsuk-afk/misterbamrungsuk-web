import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { BookingError } from "@/lib/bookings";
import { dispute } from "@/lib/bookings/day";

export const runtime = "nodejs";

// ลูกค้าแจ้งปัญหา (บอร์ด C-Dispute) → เงินพักไว้จนทีมงานตัดสิน
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { text?: string; topic?: string };
  try {
    const r = await dispute((await params).id, me.sub, `${b.topic ? `[${String(b.topic).slice(0, 40)}] ` : ""}${String(b.text ?? "")}`);
    return NextResponse.json({ ok: true, status: r.status });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message }, { status: e.code === "notfound" ? 404 : 409 });
    console.error("dispute", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
