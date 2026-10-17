import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { BookingError, demoShift, listAll } from "@/lib/bookings";
import { adminResolve, resolvePreview } from "@/lib/bookings/day";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function admin() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return s && canAccess(s.role, "/admin/orders") ? s : null;
}

// การจองทั้งหมด (หลังบ้าน /admin/orders)
// GET ?arrival=<id> = จุดที่ Part-Time กด "ถึงจุดนัด" (GPS) + ระยะจากหมุดจุดนัด · ไม่มี = รายการการจองทั้งหมด
export async function GET(req: Request) {
  if (!(await admin())) return NextResponse.json({ ok: false }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  // ?preview=<id>&pct=N = ตัวเลขก่อนยืนยันผลตัดสิน (ลูกค้าได้คืน · Part-Time ได้ · สถานะที่จะกลับไปถ้ายกคำร้อง)
  const pv = sp.get("preview");
  if (pv) {
    try { return NextResponse.json({ ok: true, preview: await resolvePreview(pv, Number(sp.get("pct")) || 0) }); }
    catch (e) { return NextResponse.json({ ok: false, error: e instanceof BookingError ? e.message : "คำนวณไม่สำเร็จ" }, { status: 404 }); }
  }
  const aid = sp.get("arrival");
  if (aid) {
    const [{ getArrival }, { getBooking }, { inThailand, km }] = await Promise.all([import("@/lib/arrival"), import("@/lib/bookings"), import("@/lib/geo")]);
    const [a, bk] = await Promise.all([getArrival(aid).catch(() => null), getBooking(aid)]);
    const pin = { lat: bk?.place?.lat, lng: bk?.place?.lng };
    const gps = a && a.lat != null && a.lng != null ? { lat: a.lat, lng: a.lng } : null;
    return NextResponse.json({ ok: true, arrival: a ? { at: a.arrived_at, gps, accuracy: a.accuracy, error: a.gps_error, dist_m: gps && inThailand(pin) ? Math.round(km(gps, pin) * 1000) : null } : null, pin: inThailand(pin) ? pin : null });
  }
  try { return NextResponse.json({ ok: true, bookings: await listAll() }); }
  catch (e) { console.error("admin bookings", e); return NextResponse.json({ ok: false, error: "ระบบการจองยังไม่เปิดใช้งาน" }, { status: 503 }); }
}

// ตัดสินคำขอยกเลิก/ข้อพิพาท: { id, action: "refund" | "reject", refund_pct, note }
export async function POST(req: Request) {
  const s = await admin();
  if (!s || !canAccess(s.role, "/admin/wallet")) return NextResponse.json({ ok: false, error: "เฉพาะฝ่ายการเงิน" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; action?: string; refund_pct?: number; note?: string; minutes?: number };
  // ทดสอบ e2e เท่านั้น: โหมดสาธิตเลื่อนเวลานัดย้อนหลัง (production/ฐานจริง = 404)
  if (b.action === "demo_shift") {
    const r = await demoShift(String(b.id ?? ""), Number(b.minutes) || 0);
    return r ? NextResponse.json({ ok: true, starts_at: r.starts_at }) : NextResponse.json({ ok: false }, { status: 404 });
  }
  if (b.action !== "refund" && b.action !== "reject") return NextResponse.json({ ok: false, error: "ไม่รู้จักคำสั่ง" }, { status: 400 });
  if (!String(b.note ?? "").trim()) return NextResponse.json({ ok: false, error: "ระบุเหตุผล/บันทึก" }, { status: 400 });
  try {
    const r = await adminResolve(String(b.id ?? ""), `admin:${s.email}`, { action: b.action, refundPct: Number(b.refund_pct) || 0, note: String(b.note).slice(0, 300) });
    return NextResponse.json({ ok: true, status: r?.status });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message }, { status: 409 });
    console.error("resolve", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
