import { NextResponse } from "next/server";
import { listPurchases } from "@/lib/partner/portal";
import { allowed } from "../guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// รายการชำระค่าแผนโปรโมท (?partner=id กรองรายพาร์ทเนอร์)
export async function GET(req: Request) {
  if (!(await allowed())) return NextResponse.json({ ok: false }, { status: 401 });
  const pid = new URL(req.url).searchParams.get("partner") ?? undefined;
  return NextResponse.json({ ok: true, rows: await listPurchases(pid) });
}
