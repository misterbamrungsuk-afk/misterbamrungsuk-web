import { NextResponse } from "next/server";
import { currentPartner } from "@/lib/partner/auth";
import { PayoutError, requestPayout, walletOf } from "@/lib/payouts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// กระเป๋าของพาร์ทเนอร์ (ค่าห้องจากนัดที่จบแล้ว) · POST = ขอถอน → CEO อนุมัติ → ทีมงานโอน
export async function GET() {
  const p = await currentPartner();
  if (!p) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await walletOf("partner", p.id)) });
}
export async function POST(req: Request) {
  const p = await currentPartner();
  if (!p) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { amount?: number; bank?: unknown };
  try { return NextResponse.json({ ok: true, request: await requestPayout("partner", p.id, p.business_name, Number(b.amount), b.bank) }); }
  catch (e) { if (e instanceof PayoutError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 }); throw e; }
}
