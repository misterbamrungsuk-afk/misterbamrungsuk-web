import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MemberError, SALES_COOKIE, readSalesLink, repSummary, requestSalesPayout } from "@/lib/member";
import { findRep } from "@/lib/member/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function rep() {
  const id = readSalesLink((await cookies()).get(SALES_COOKIE)?.value);
  const r = id ? await findRep({ id }) : null;
  return r?.active && r.kind === "external" ? r : null;
}

// แดชบอร์ด Recruit ภายนอก: GET = ผลงาน + ค่าคอม · POST { amount } = ขอรับค่าคอม (CEO อนุมัติ → แอดมินโอน)
export async function GET(req: Request) {
  const r = await rep();
  if (!r) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await repSummary(r)), link: `${new URL(req.url).origin}/ref/${r.code}`, bank: r.bank });
}

export async function POST(req: Request) {
  const r = await rep();
  if (!r) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { amount?: number };
  try {
    const p = await requestSalesPayout(r, Number(b.amount) || 0);
    return NextResponse.json({ ok: true, status: p.status });
  } catch (e) {
    if (e instanceof MemberError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("sales payout", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
