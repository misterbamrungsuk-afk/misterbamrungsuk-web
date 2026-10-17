import { NextResponse } from "next/server";
import { getProfile } from "@/lib/customer/profile";
import { currentCustomer } from "@/lib/customer/auth";
import { limited } from "@/lib/rate-limit";
import { BookingError } from "@/lib/bookings";
import { createQuick, openQuickForCustomer, quickView as view } from "@/lib/bookings/quick";
import { getMoney } from "@/lib/wallet/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET = เรียกด่วนล่าสุดของฉัน · POST = ส่งเรียกด่วน { activity, hours, place: { type, detail, lat?, lng? }, note }
export async function GET() {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const [q, m] = await Promise.all([openQuickForCustomer(me.sub).catch(() => null), getMoney()]);
  return NextResponse.json({ ok: true, quick: await view(q), seconds: m.quickSeconds });
}
export async function POST(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (await limited(`quick:${me.sub}`, 6, 60 * 60_000)) return NextResponse.json({ ok: false, error: "เรียกบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const p = (b.place ?? {}) as Record<string, unknown>;
  if (Number(b.hours) !== 3 && Number(b.hours) !== 5) return NextResponse.json({ ok: false, error: "เลือกระยะเวลา 3 หรือ 5 ชม." }, { status: 400 });
  try {
    const q = await createQuick({ sub: me.sub, email: me.email }, { activity: String(b.activity ?? ""), hours: Number(b.hours) === 5 ? 5 : 3, place: { type: String(p.type ?? ""), detail: String(p.detail ?? ""), lat: p.lat, lng: p.lng }, note: String(b.note ?? ""), blocked: (await getProfile(me.sub, me.email).catch(() => null))?.blocked ?? [] });
    return NextResponse.json({ ok: true, quick: await view(q) });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message, code: e.code, ...(e.data ?? {}) }, { status: e.code === "funds" ? 402 : 400 });
    console.error("quick create", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง กรุณาลองใหม่" }, { status: 500 });
  }
}
