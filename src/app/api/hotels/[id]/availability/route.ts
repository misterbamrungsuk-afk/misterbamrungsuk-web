import { NextResponse } from "next/server";
import { getPartner } from "@/lib/partner/store";
import { isPublicPartner } from "@/lib/partner/kind";
import { fileUrl } from "@/lib/partner/portal-types";
import { StayError, availability, checkRange, isHotelPartner } from "@/lib/hotels/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ห้องว่างของโรงแรมในช่วงวันที่  ?in=YYYY-MM-DD&out=YYYY-MM-DD
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sp = new URL(req.url).searchParams;
  const p = await getPartner(id).catch(() => null);
  if (!p || !isPublicPartner(p) || !(await isHotelPartner(p))) return NextResponse.json({ ok: false, error: "ไม่พบโรงแรม" }, { status: 404 });
  try {
    const r = checkRange(sp.get("in"), sp.get("out"));
    const rooms = (await availability(id, r.check_in, r.check_out)).map((t) => ({ ...t, photos: t.photos.map((x) => fileUrl(x)) }));
    return NextResponse.json({ ok: true, nights: r.nights, rooms });
  } catch (e) {
    if (e instanceof StayError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    console.error("stay availability", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
