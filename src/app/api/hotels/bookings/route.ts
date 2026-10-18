import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { limited } from "@/lib/rate-limit";
import { StayError, createStay, listStays } from "@/lib/hotels/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// การจองห้องพักของลูกค้า — GET = ของฉัน · POST = จอง + ชำระจากกระเป๋า
export async function GET() {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  try { return NextResponse.json({ ok: true, rows: await listStays({ customer: me.sub }) }); }
  catch (e) { console.error("stays list", e); return NextResponse.json({ ok: false, error: "ระบบจองห้องพักยังไม่เปิดใช้งาน" }, { status: 503 }); }
}

export async function POST(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบก่อนจอง", code: "login" }, { status: 401 });
  if (await limited(`stay-book:${me.sub}`, 10, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ทำรายการถี่เกินไป ลองใหม่ภายหลัง" }, { status: 429 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ ok: false, error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  try {
    const row = await createStay({ sub: me.sub, email: me.email ?? null }, {
      hotel_id: b.hotel_id, room_type_id: b.room_type_id, check_in: b.check_in, check_out: b.check_out, rooms: b.rooms, guests: b.guests, guest_name: b.guest_name, note: b.note,
    });
    return NextResponse.json({ ok: true, id: row.id, code: row.code, row });
  } catch (e) {
    if (e instanceof StayError) return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: e.status });
    console.error("stay create", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง ลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
