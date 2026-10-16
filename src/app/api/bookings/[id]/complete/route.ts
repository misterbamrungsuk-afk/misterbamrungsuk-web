import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { BookingError } from "@/lib/bookings";
import { customerComplete } from "@/lib/bookings/day";

export const runtime = "nodejs";

// ลูกค้ายืนยันจบงาน + รีวิว + ทิป (บอร์ด C-Complete) → แบ่งเงินให้ Part-Time (รอปล่อยตามเวลาที่ตั้ง)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { rating?: number; tags?: string[]; again?: string; body?: string; tip?: number };
  try {
    const r = await customerComplete((await params).id, me.sub, { rating: Number(b.rating) || 0, tags: Array.isArray(b.tags) ? b.tags.map(String) : [], again: String(b.again ?? ""), body: String(b.body ?? ""), tip: Math.min(100000, Math.max(0, Number(b.tip) || 0)) });
    return NextResponse.json({ ok: true, status: r.status });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message }, { status: e.code === "notfound" ? 404 : 409 });
    console.error("complete", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
