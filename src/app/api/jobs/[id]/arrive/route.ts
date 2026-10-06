import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getArrival, recordArrival } from "@/lib/arrival";
import { NOSHOW_WAIT_MIN } from "@/lib/noshow-rules";

export const runtime = "nodejs";
const ID = /^[0-9A-Za-z-]{1,40}$/;

// สถานะการมาถึง — ใช้ทั้งหน้า Part-Time (ตัวจับเวลา) และฝั่งลูกค้า ("เพื่อนถึงจุดนัดแล้ว")
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ ok: false, error: "ไม่พบนัดหมาย" }, { status: 400 });
  const a = await getArrival(id).catch(() => null);
  return NextResponse.json({ ok: true, arrival: a, waitMin: NOSHOW_WAIT_MIN }, { headers: { "Cache-Control": "no-store" } });
}

// Part-Time กด "ถึงจุดนัดแล้ว": { providerId, lat?, lng?, accuracy?, gpsError? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await cookies()).get("hamoo_session")?.value) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ ok: false, error: "ไม่พบนัดหมาย" }, { status: 400 });
  const b = (await req.json().catch(() => ({}))) as { providerId?: string; lat?: number; lng?: number; accuracy?: number; gpsError?: string };
  const lat = Number(b.lat), lng = Number(b.lng);
  const hasGps = b.lat != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  try {
    const arrival = await recordArrival({
      booking_id: id, provider_id: String(b.providerId ?? "").slice(0, 60),
      lat: hasGps ? lat : null, lng: hasGps ? lng : null,
      accuracy: hasGps && Number.isFinite(Number(b.accuracy)) ? Math.round(Number(b.accuracy)) : null,
      gps_error: hasGps ? null : String(b.gpsError ?? "").slice(0, 120) || null,
    });
    return NextResponse.json({ ok: true, arrival, waitMin: NOSHOW_WAIT_MIN });
  } catch (e) {
    console.error("arrive", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง กรุณาลองใหม่" }, { status: 500 });
  }
}
