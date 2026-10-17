import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { bookingActor } from "@/lib/bookings/auth";
import { BookingError } from "@/lib/bookings";
import { noShowState, reportNoShow } from "@/lib/bookings/noshow";
import { inThailand } from "@/lib/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// แจ้งผิดนัด — ลูกค้า (คุกกี้) หรือ Part-Time (mb + t)
// GET ?booking=&mb=&t= = แจ้งได้ไหม/ได้ตอนไหน · POST (multipart) booking, mb?, t?, note, lat?, lng?, accuracy?, gps_error?, photo?
export async function GET(req: Request) {
  const u = new URL(req.url);
  const who = await bookingActor(u.searchParams.get("booking") ?? "", u.searchParams.get("mb"), u.searchParams.get("t"));
  if (!who) return NextResponse.json({ ok: false, error: "ไม่พบการจอง" }, { status: 404 });
  const st = await noShowState(who.b, who.role === "customer" ? "customer" : "provider");
  return NextResponse.json({ ok: true, role: who.role, ...st });
}

export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ ok: false, error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const s = (k: string) => { const v = fd.get(k); return typeof v === "string" ? v : ""; };
  const who = await bookingActor(s("booking"), s("mb") || null, s("t") || null);
  if (!who) return NextResponse.json({ ok: false, error: "ไม่พบการจอง" }, { status: 404 });
  if (await limited(`noshow:${who.role}:${who.b.id}`, 5, 60 * 60_000)) return NextResponse.json({ ok: false, error: "ส่งบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  const g = { lat: Number(s("lat")), lng: Number(s("lng")) };
  const acc = Number(s("accuracy"));
  const f = fd.get("photo");
  try {
    const claim = await reportNoShow(who.b, who.role === "customer" ? "customer" : "provider", {
      note: s("note"),
      gps: inThailand(g) ? { ...g, accuracy: Number.isFinite(acc) ? Math.round(acc) : 0 } : null,
      gpsError: s("gps_error"),
      photo: f instanceof File ? f : null,
    });
    return NextResponse.json({ ok: true, claim: { id: claim.id, status: claim.status } });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message }, { status: e.code === "photo" ? 400 : 409 });
    console.error("noshow report", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง กรุณาลองใหม่" }, { status: 500 });
  }
}
