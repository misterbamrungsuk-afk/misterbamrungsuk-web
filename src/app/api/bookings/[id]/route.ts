import { NextResponse } from "next/server";
import { bookingActor } from "@/lib/bookings/auth";
import { ptPublic } from "@/lib/bookings";
import { cancelRefundPct, getMoney } from "@/lib/wallet/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// รายละเอียดการจอง — ลูกค้าเจ้าของ หรือ Part-Time (?mb=&t=)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = new URL(req.url);
  const who = await bookingActor((await params).id, u.searchParams.get("mb"), u.searchParams.get("t"));
  if (!who) return NextResponse.json({ ok: false, error: "ไม่พบการจอง" }, { status: 404 });
  const { b, role } = who;
  return NextResponse.json({ ok: true, role, booking: role === "customer" ? { ...b, pt: ptPublic(b), parttime_id: undefined, parttime_mb: undefined, cancel_refund_pct: b.status === "accepted" ? cancelRefundPct(await getMoney(), b.starts_at) : null } : { ...b, customer_email: undefined, customer_id: undefined } });
}
