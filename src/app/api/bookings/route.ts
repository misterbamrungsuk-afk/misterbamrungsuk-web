import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { getProfile } from "@/lib/customer/profile";
import { currentCustomer } from "@/lib/customer/auth";
import { inThailand } from "@/lib/geo";
import { BookingError, createBooking, listForCustomer, ptPublic, type Place, type PlaceType } from "@/lib/bookings";
import { getLiveApplicants, publicId } from "@/lib/home/live";
import { spaServiceFor } from "@/lib/market/partners";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const TYPES: PlaceType[] = ["out", "outdoor", "mall", "cafe", "condo", "hotel", "spa"];
const LABEL: Record<PlaceType, string> = { out: "นอกสถานที่", outdoor: "กลางแจ้ง", mall: "ห้าง", cafe: "คาเฟ่ / ร้านอาหาร", condo: "คอนโด", hotel: "โรงแรม", spa: "สปา" };

// การจองของฉัน (ลูกค้า)
export async function GET() {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  try {
    const rows = await listForCustomer(me.sub);
    return NextResponse.json({ ok: true, bookings: rows.map((b) => ({ ...b, pt: ptPublic(b), parttime_id: undefined, parttime_mb: undefined })) });
  } catch (e) {
    console.error("bookings list", e);
    return NextResponse.json({ ok: false, error: "ระบบการจองยังไม่เปิดใช้งาน" }, { status: 503 });
  }
}

// ส่งคำขอนัด: { pid, hours, starts_at, place: { type, detail, spa_id? }, note }
export async function POST(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (await limited(`book:${me.sub}`, 10, 60 * 60_000)) return NextResponse.json({ ok: false, error: "ส่งคำขอบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const p = (b.place ?? {}) as Record<string, unknown>;
  const type = String(p.type ?? "") as PlaceType;
  if (!TYPES.includes(type)) return NextResponse.json({ ok: false, error: "เลือกสถานที่นัด" }, { status: 400 });
  const detail = String(p.detail ?? "").trim().slice(0, 200);
  let roomFee = 0;
  let spa: { id: string; name: string; service: { id: string; name: string } | null } | null = null;
  if (type === "spa") {
    // ลูกค้าเลือกบริการ (ห้อง/แพ็กเกจ) ของสปา → ค่าห้อง = ราคาบริการจากหน้าร้าน (คิดฝั่งเซิร์ฟเวอร์เสมอ ไม่เชื่อราคาจากหน้าเว็บ)
    const hit = await spaServiceFor(p.spa_id, p.service_id).catch(() => null);
    if (!hit?.spa) return NextResponse.json({ ok: false, error: "เลือกสปาพาร์ทเนอร์" }, { status: 400 });
    if (!hit.ok) return NextResponse.json({ ok: false, error: "เลือกบริการ / ห้องของสปาก่อน" }, { status: 400 });
    spa = { id: hit.spa.id, name: hit.spa.name, service: hit.service ? { id: hit.service.id, name: hit.service.name } : null };
    roomFee = hit.service?.price ?? 0;
  } else if (!detail) return NextResponse.json({ ok: false, error: "กรอกจุดนัดพบ / ที่อยู่" }, { status: 400 });
  // หมุดจุดนัด (ลูกค้าปักบนแผนที่) — ใช้คิดระยะ/เวลาถึงตอนเพื่อนเดินทาง และให้เพื่อนเปิดนำทาง
  const pin = { lat: Math.round(Number(p.lat) * 1e5) / 1e5, lng: Math.round(Number(p.lng) * 1e5) / 1e5 };
  // บริการที่เลือกเก็บใน place (jsonb) → พอร์ทัลสปาเห็นว่าลูกค้าจองอะไร
  const svcExtra = spa?.service ? { spa_service: spa.service.name, spa_service_id: spa.service.id } : {};
  const place: Place = { type, label: LABEL[type], detail: spa ? (spa.service ? `${spa.name} · ${spa.service.name}` : spa.name) : detail, ...(spa ? { spa_id: spa.id, spa_name: spa.name } : {}), ...svcExtra, ...(inThailand(pin) ? pin : {}) };
  const prof = await getProfile(me.sub, me.email).catch(() => null);
  if (prof?.blocked.includes(String(b.pid ?? ""))) return NextResponse.json({ ok: false, error: "คุณบล็อกเพื่อนคนนี้ไว้ · ยกเลิกบล็อกได้ที่ บัญชี › ผู้ใช้ที่บล็อก" }, { status: 403 });
  // ไม่แปลงค่าเอง — createBooking ปฏิเสธที่ไม่ใช่ 3/5 ชม. (กันจ่ายราคา 3 ชม. แต่คิดว่าได้ 4 ชม.)
  const hours = Number(b.hours) as 3 | 5;
  try {
    const row = await createBooking({ sub: me.sub, email: me.email, name: prof?.name || undefined }, { pid: String(b.pid ?? ""), hours, starts_at: String(b.starts_at ?? ""), place, note: String(b.note ?? "") },
      async (pid) => (await getLiveApplicants()).find((a) => publicId(a.mb_code) === pid) ?? null, roomFee);
    return NextResponse.json({ ok: true, id: row.id, code: row.code });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message, code: e.code, ...e.data }, { status: e.code === "funds" ? 402 : 400 });
    console.error("booking create", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง กรุณาลองใหม่" }, { status: 500 });
  }
}
