import { NextResponse } from "next/server";
import { currentParttime } from "@/lib/bookings/auth";
import { listForParttime } from "@/lib/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// งานของ Part-Time (?mb=&t=) — ไม่ส่งอีเมล/รหัสลูกค้า
export async function GET(req: Request) {
  const u = new URL(req.url);
  const a = await currentParttime(u.searchParams.get("mb") ?? "", u.searchParams.get("t"));
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  try {
    const rows = await listForParttime(a.id);
    return NextResponse.json({ ok: true, bookings: rows.map((b) => ({ ...b, customer_email: undefined, customer_id: undefined })) });
  } catch (e) {
    console.error("pt bookings", e);
    return NextResponse.json({ ok: false, error: "ระบบการจองยังไม่เปิดใช้งาน" }, { status: 503 });
  }
}
