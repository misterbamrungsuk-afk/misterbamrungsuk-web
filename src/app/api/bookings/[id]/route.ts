import { NextResponse } from "next/server";
import { bookingActor } from "@/lib/bookings/auth";
import { ptPublic } from "@/lib/bookings";
import { changeInfo } from "@/lib/bookings/changes";
import { ptBlocks } from "@/lib/bookings/blocks";
import { cancelRefundPct, getMoney } from "@/lib/wallet/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// รายละเอียดการจอง — ลูกค้าเจ้าของ หรือ Part-Time (?mb=&t=) · แนบคำขอเปลี่ยนเวลา/ต่อเวลา (change) ให้ทั้งสองฝั่ง
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = new URL(req.url);
  const who = await bookingActor((await params).id, u.searchParams.get("mb"), u.searchParams.get("t"));
  if (!who) return NextResponse.json({ ok: false, error: "ไม่พบการจอง" }, { status: 404 });
  const { b, role } = who;
  const money = await getMoney();
  const change = await changeInfo(b).catch((e) => { console.error("change info", e); return null; });
  // Part-Time: ลูกค้าของนัดนี้ถูกบล็อกอยู่ไหม (เมนูหัวแชท)
  const blocked_customer = role === "parttime" ? await ptBlocks(b.parttime_id, b.customer_id).catch(() => false) : undefined;
  // ลูกค้าเห็นยอดคืนจริงก่อนยืนยันยกเลิก (กติกาอัตโนมัติ) หรือข้อความกติกาที่ทีมงานใช้พิจารณา
  return NextResponse.json({ ok: true, role, change, blocked_customer, booking: role === "customer" ? { ...b, pt: ptPublic(b), parttime_id: undefined, parttime_mb: undefined, cancel_refund_pct: b.status === "accepted" ? cancelRefundPct(money, b.starts_at) : null, cancel_rule: money.cancelRule } : { ...b, customer_email: undefined, customer_id: undefined } });
}
