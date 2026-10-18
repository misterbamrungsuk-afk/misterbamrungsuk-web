import { NextResponse } from "next/server";
import { currentPartner } from "@/lib/partner/auth";
import { PATH_RE } from "@/lib/partner/portal";
import { isHotelPartner, listRoomTypes, saveRoomTypes, type RoomTypeInput } from "@/lib/hotels/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

// ประเภทห้องของโรงแรม (พอร์ทัลพาร์ทเนอร์) — GET = รายการ · PUT { rooms: [...] } = บันทึกทั้งชุด (ที่ไม่ได้ส่งมา = ปิดขาย)
export async function GET() {
  const p = await currentPartner();
  if (!p) return bad("กรุณาเข้าสู่ระบบ", 401);
  return NextResponse.json({ ok: true, rooms: (await listRoomTypes(p.id).catch(() => [])).filter((t) => t.active) });
}

export async function PUT(req: Request) {
  const p = await currentPartner();
  if (!p) return bad("กรุณาเข้าสู่ระบบ", 401);
  if (!(await isHotelPartner(p))) return bad("ประเภทห้องใช้ได้เฉพาะพาร์ทเนอร์โรงแรม", 403);
  const b = (await req.json().catch(() => null)) as { rooms?: unknown } | null;
  if (!b || !Array.isArray(b.rooms)) return bad("ข้อมูลไม่ถูกต้อง");
  if (b.rooms.length > 20) return bad("ประเภทห้องได้ไม่เกิน 20 แบบ");
  // รูปต้องเป็นรูปหน้าร้านของพาร์ทเนอร์คนนี้ (อัปผ่าน /api/partner/listing/image — ตรวจไฟล์จริงแล้ว)
  const own = (v: unknown): v is string => typeof v === "string" && PATH_RE.test(v) && v.startsWith(`${p.id}/listing/`);
  const items: RoomTypeInput[] = [];
  for (const x of b.rooms as Record<string, unknown>[]) {
    const name = String(x?.name ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    if (!name) return bad("กรอกชื่อประเภทห้องให้ครบ");
    const baht = Number(x?.price_baht);
    const price_satang = Math.round(baht * 100);
    if (!(Number.isFinite(baht) && price_satang >= 100 && price_satang <= 10_000_000)) return bad(`ราคาต่อคืนของ "${name}" ต้องอยู่ระหว่าง 1–100,000 บาท`);
    const capacity = Math.round(Number(x?.capacity));
    if (!(capacity >= 1 && capacity <= 20)) return bad(`จำนวนผู้เข้าพักของ "${name}" ต้องอยู่ระหว่าง 1–20 คน`);
    const rooms = Math.round(Number(x?.rooms));
    if (!(rooms >= 1 && rooms <= 500)) return bad(`จำนวนห้องของ "${name}" ต้องอยู่ระหว่าง 1–500`);
    const photos = Array.isArray(x?.photos) ? (x.photos as unknown[]).filter(own).slice(0, 6) : [];
    const description = String(x?.description ?? "").trim().slice(0, 300) || null;
    const id = typeof x?.id === "string" && /^[0-9a-f-]{36}$/.test(x.id) ? x.id : undefined;
    items.push({ id, name, price_satang, capacity, rooms, photos, description });
  }
  try {
    return NextResponse.json({ ok: true, rooms: (await saveRoomTypes(p.id, items)).filter((t) => t.active) });
  } catch (e) {
    console.error("room types save", e);
    return bad("บันทึกไม่สำเร็จ", 500);
  }
}
