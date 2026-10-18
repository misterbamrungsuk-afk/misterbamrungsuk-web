import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { limited } from "@/lib/rate-limit";
import { StayError, customerCancel, getStay, sweep } from "@/lib/hotels/store";
import { cancelRule } from "@/lib/hotels/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  await sweep().catch(() => null);
  const b = await getStay((await params).id).catch(() => null);
  if (!b || b.customer_id !== me.sub || b.status === "paying") return NextResponse.json({ ok: false, error: "ไม่พบรายการ" }, { status: 404 });
  return NextResponse.json({ ok: true, booking: b, cancel: cancelRule(b) });
}

// ลูกค้ายกเลิก { action: "cancel", expect_refund?: boolean } — กติกาคืนเงินตาม cancelRule (ฝั่งเซิร์ฟเวอร์)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (await limited(`stay-cancel:${me.sub}`, 10, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ทำรายการถี่เกินไป ลองใหม่ภายหลัง" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { action?: string; expect_refund?: boolean };
  if (b.action !== "cancel") return NextResponse.json({ ok: false, error: "ไม่รู้จักคำสั่ง" }, { status: 400 });
  try {
    const row = await customerCancel(me.sub, (await params).id, typeof b.expect_refund === "boolean" ? b.expect_refund : undefined);
    return NextResponse.json({ ok: true, booking: row });
  } catch (e) {
    if (e instanceof StayError) return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: e.status });
    console.error("stay cancel", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
