import { NextResponse } from "next/server";
import { currentVendor } from "@/lib/market/vendor-auth";
import { PayoutError, requestPayout, walletOf } from "@/lib/payouts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// กระเป๋าของร้านค้า (ส่วนของร้านจากออเดอร์ที่สำเร็จ) · POST = ขอถอน → CEO อนุมัติ → ทีมงานโอน
export async function GET() {
  const me = await currentVendor();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await walletOf("vendor", me.vendor.id)) });
}
export async function POST(req: Request) {
  const me = await currentVendor();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { amount?: number; bank?: unknown };
  try { return NextResponse.json({ ok: true, request: await requestPayout("vendor", me.vendor.id, me.vendor.name, Number(b.amount), b.bank) }); }
  catch (e) { if (e instanceof PayoutError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 }); throw e; }
}
