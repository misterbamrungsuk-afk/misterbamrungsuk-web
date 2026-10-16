import { NextResponse } from "next/server";
import { currentParttime } from "@/lib/bookings/auth";
import { BookingError } from "@/lib/bookings";
import { acceptQuick, openForParttime } from "@/lib/bookings/quick";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Part-Time: GET ?mb&t = เรียกด่วนที่เชิญฉันอยู่ · POST { mb, t, id } = รับนัด (คนแรกเท่านั้น)
export async function GET(req: Request) {
  const u = new URL(req.url);
  const a = await currentParttime(u.searchParams.get("mb") ?? "", u.searchParams.get("t"));
  if (!a) return NextResponse.json({ ok: false }, { status: 401 });
  const rows = await openForParttime(a).catch(() => []);
  return NextResponse.json({ ok: true, calls: rows.map(({ q, price }) => ({ id: q.id, code: q.code, activity: q.activity, hours: q.hours, place: q.place, note: q.note, price_satang: price, expires_at: q.expires_at })) });
}
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { mb?: string; t?: string; id?: string };
  const a = await currentParttime(String(b.mb ?? ""), b.t ?? null);
  if (!a) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const r = await acceptQuick(String(b.id ?? ""), a);
    return NextResponse.json({ ok: true, booking: { id: r.id, code: r.code, starts_at: r.starts_at } });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message }, { status: e.code === "notfound" ? 404 : 409 });
    console.error("quick accept", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
