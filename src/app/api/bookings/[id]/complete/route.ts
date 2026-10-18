import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { BookingError, getBooking, isDemo } from "@/lib/bookings";
import { customerComplete } from "@/lib/bookings/day";
import { respondExtend } from "@/lib/bookings/changes";

export const runtime = "nodejs";

// ทดสอบเท่านั้น: โหมดสาธิต + ไม่ใช่ production/Vercel
const demoTools = () => isDemo && process.env.NODE_ENV !== "production" && !process.env.VERCEL_ENV;

// ลูกค้ายืนยันจบงาน + รีวิว + ทิป (บอร์ด C-Complete) → แบ่งเงินให้ Part-Time (รอปล่อยตามเวลาที่ตั้ง)
// demo_race_extend (โหมดสาธิตเท่านั้น): เพื่อนรับคำขอต่อเวลาที่รออยู่ "ระหว่าง" ที่ระบบจบงาน — e2e ใช้พิสูจน์ว่าเงินไม่ค้างใน escrow
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { rating?: number; tags?: string[]; again?: string; body?: string; tip?: number; demo_race_extend?: boolean };
  const id = (await params).id;
  let beforeMove: (() => Promise<unknown>) | undefined;
  if (b.demo_race_extend && demoTools()) {
    const bk = await getBooking(id);
    if (bk && bk.customer_id === me.sub) beforeMove = () => respondExtend(bk.id, bk.parttime_id, true);
  }
  try {
    const r = await customerComplete(id, me.sub, { rating: Number(b.rating) || 0, tags: Array.isArray(b.tags) ? b.tags.map(String) : [], again: String(b.again ?? ""), body: String(b.body ?? ""), tip: Number(b.tip) || 0 /* ขอบเขตตรวจใน customerComplete (0–TIP_MAX บาทเต็ม) */ }, { beforeMove });
    return NextResponse.json({ ok: true, status: r.status, total_satang: r.total_satang });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message }, { status: e.code === "notfound" ? 404 : 409 });
    console.error("complete", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
