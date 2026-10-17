import { NextResponse } from "next/server";
import { bookingActor } from "@/lib/bookings/auth";
import { trackForCustomer } from "@/lib/bookings/track";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ลูกค้าเจ้าของนัดเท่านั้น: ตำแหน่ง Part-Time ระหว่างเดินทาง + ระยะ + เวลาถึงโดยประมาณ (Part-Time เรียกเส้นนี้ไม่ได้)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await bookingActor(id);
  if (!a || a.role !== "customer") return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, ...(await trackForCustomer(a.b)) });
}
