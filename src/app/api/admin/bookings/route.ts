import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { BookingError, listAll } from "@/lib/bookings";
import { adminResolve } from "@/lib/bookings/day";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function admin() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return s && canAccess(s.role, "/admin/orders") ? s : null;
}

// การจองทั้งหมด (หลังบ้าน /admin/orders)
export async function GET() {
  if (!(await admin())) return NextResponse.json({ ok: false }, { status: 401 });
  try { return NextResponse.json({ ok: true, bookings: await listAll() }); }
  catch (e) { console.error("admin bookings", e); return NextResponse.json({ ok: false, error: "ระบบการจองยังไม่เปิดใช้งาน" }, { status: 503 }); }
}

// ตัดสินคำขอยกเลิก/ข้อพิพาท: { id, action: "refund" | "reject", refund_pct, note }
export async function POST(req: Request) {
  const s = await admin();
  if (!s || !canAccess(s.role, "/admin/wallet")) return NextResponse.json({ ok: false, error: "เฉพาะฝ่ายการเงิน" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; action?: string; refund_pct?: number; note?: string };
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
