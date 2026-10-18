import { NextResponse } from "next/server";
import { currentVendor } from "@/lib/market/vendor-auth";
import { inboxGet, inboxPost } from "@/lib/notices/inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// กล่องแจ้งเตือนร้านค้า (ผูกกับร้าน ไม่ใช่บัญชี — ทุกบัญชีของร้านเห็นชุดเดียวกัน) · GET ?count=1 · POST { id } / { all: true }
export async function GET(req: Request) {
  const me = await currentVendor();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  return inboxGet({ type: "vendor", id: me.vendor.id }, req);
}
export async function POST(req: Request) {
  const me = await currentVendor();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  return inboxPost({ type: "vendor", id: me.vendor.id }, req);
}
