import { NextResponse } from "next/server";
import { currentVendor } from "@/lib/market/vendor-auth";
import { vendorData } from "@/lib/market/vendor-data";
import { reportCsv } from "@/lib/market/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ข้อมูลพอร์ทัลร้านค้า (เฉพาะของร้านที่ล็อกอิน) · ?format=csv → รายงานรายเดือน
export async function GET(req: Request) {
  const me = await currentVendor();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const d = await vendorData(me.vendor);
  if (new URL(req.url).searchParams.get("format") === "csv")
    return new Response(reportCsv(d.report), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="payout-${me.vendor.id.slice(0, 8)}.csv"` } });
  return NextResponse.json({ ok: true, email: me.account.email, ...d });
}
