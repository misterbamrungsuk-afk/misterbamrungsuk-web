import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { listCallsForBooking } from "@/lib/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// หลังบ้าน: ประวัติการโทรของนัด (เวลา · ผู้โทร · ความยาว · ผลสาย) — ไม่มี SDP · GET ?booking_id=
export async function GET(req: Request) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s || !canAccess(s.role, "/admin/orders")) return NextResponse.json({ ok: false }, { status: 401 });
  const id = String(new URL(req.url).searchParams.get("booking_id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ ok: false, error: "booking_id ไม่ถูกต้อง" }, { status: 400 });
  return NextResponse.json({ ok: true, calls: await listCallsForBooking(id) }, { headers: { "Cache-Control": "no-store" } });
}
