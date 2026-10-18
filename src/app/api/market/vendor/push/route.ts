import { NextResponse } from "next/server";
import { currentVendor } from "@/lib/market/vendor-auth";
import { pushBind } from "@/lib/notices/inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ผูกอุปกรณ์รับ web push ของร้านค้า (cookie mb_vendor)
export async function POST(req: Request) {
  const me = await currentVendor();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  return pushBind({ type: "vendor", id: me.vendor.id }, req);
}
