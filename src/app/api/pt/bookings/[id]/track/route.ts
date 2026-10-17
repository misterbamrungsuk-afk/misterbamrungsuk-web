import { NextResponse } from "next/server";
import { currentParttime } from "@/lib/bookings/auth";
import { getBooking } from "@/lib/bookings";
import { TrackError, pushTrack } from "@/lib/bookings/track";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Part-Time ส่งตำแหน่งระหว่างเดินทาง { mb, t, lat, lng, accuracy } → คืนระยะ/เวลาถึงจุดนัด
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { mb?: string; t?: string; lat?: number; lng?: number; accuracy?: number };
  const pt = await currentParttime(String(b.mb ?? ""), b.t);
  const bk = pt ? await getBooking(id) : null;
  if (!pt || !bk || bk.parttime_id !== pt.id) return NextResponse.json({ ok: false }, { status: 403 });
  try { return NextResponse.json({ ok: true, track: await pushTrack(bk, b) }); }
  catch (e) { if (e instanceof TrackError) return NextResponse.json({ ok: false, error: e.message }, { status: 409 }); throw e; }
}
