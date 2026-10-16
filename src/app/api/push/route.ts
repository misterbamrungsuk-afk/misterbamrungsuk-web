import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { currentParttime } from "@/lib/bookings/auth";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { pushEnabled, pushPublicKey, removeSub, saveSub, validSub } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// web push (#16): GET = public key · POST { sub, mb?, t?, admin? } (admin = เครื่องแอดมินรับ SOS/แจ้งเตือนระบบ) = ผูกอุปกรณ์กับลูกค้า (session) หรือ Part-Time (mb+t) · DELETE { endpoint }
export async function GET() {
  return NextResponse.json({ ok: true, enabled: pushEnabled(), key: pushPublicKey() });
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { sub?: unknown; mb?: string; t?: string; admin?: boolean };
  if (!validSub(b.sub)) return NextResponse.json({ ok: false, error: "ข้อมูลอุปกรณ์ไม่ถูกต้อง" }, { status: 400 });
  let who: { type: "customer" | "parttime" | "admin"; id: string } | null = null;
  if (b.admin) { const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value); if (s) who = { type: "admin", id: "all" }; }
  else if (b.mb) { const a = await currentParttime(String(b.mb), b.t ? String(b.t) : null); if (a) who = { type: "parttime", id: a.id }; }
  else { const me = await currentCustomer(); if (me) who = { type: "customer", id: me.sub }; }
  if (!who) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  await saveSub(who.type, who.id, b.sub);
  return NextResponse.json({ ok: true, enabled: pushEnabled() });
}

export async function DELETE(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (typeof b.endpoint === "string" && b.endpoint.startsWith("https://")) await removeSub(b.endpoint);
  return NextResponse.json({ ok: true });
}
