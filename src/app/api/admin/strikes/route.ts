import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { strikeCounts } from "@/lib/noshow";
import { STRIKE_EXPIRE_DAYS } from "@/lib/strikes";

export const runtime = "nodejs";

// จำนวนใบเตือนที่ยังไม่หมดอายุ ต่อ provider_id (อ่านอย่างเดียว)
export async function GET() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s || !canAccess(s.role, "/admin/members")) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, counts: await strikeCounts(STRIKE_EXPIRE_DAYS) }, { headers: { "Cache-Control": "no-store" } });
}
