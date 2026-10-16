import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { BookingError } from "@/lib/bookings";
import { cancelQuick, getQuickForCustomer, quickView as view } from "@/lib/bookings/quick";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET = สถานะ (หน้าจอรอดึงทุก 2 วิ) · POST { action: "cancel" } = ยกเลิก + คืนเงิน
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const q = await getQuickForCustomer((await params).id, me.sub);
  return q ? NextResponse.json({ ok: true, quick: await view(q) }) : NextResponse.json({ ok: false, error: "ไม่พบคำขอ" }, { status: 404 });
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { action?: string };
  if (b.action !== "cancel") return NextResponse.json({ ok: false, error: "action" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, quick: await view(await cancelQuick((await params).id, me.sub)) });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message }, { status: e.code === "notfound" ? 404 : 409 });
    console.error("quick cancel", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
