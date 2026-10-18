import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { StayError, adminRefund, demoShiftStay, listStays, stayRecon } from "@/lib/hotels/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// การจองห้องพักโรงแรม (หลังบ้าน /admin/stays) — สิทธิ์เดียวกับกระเป๋าเงิน (CEO / super / finance)
async function admin() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return s && canAccess(s.role, "/admin/wallet") ? s : null;
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const [rows, recon] = await Promise.all([listStays({ limit: 1000 }), stayRecon()]);
    return NextResponse.json({ ok: true, rows, recon });
  } catch (e) { console.error("admin stays", e); return NextResponse.json({ ok: false, error: "ระบบจองห้องพักยังไม่เปิดใช้งาน" }, { status: 503 }); }
}

// { action: "refund", id, note } = คืนเงินเต็ม · { action: "demo_shift", id, days, minutes } = ทดสอบ e2e (เดโมในเครื่องเท่านั้น)
export async function POST(req: Request) {
  const s = await admin();
  if (!s) return NextResponse.json({ ok: false, error: "เฉพาะฝ่ายการเงิน" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { action?: string; id?: string; note?: string; days?: number; minutes?: number };
  if (b.action === "demo_shift") {
    const r = demoShiftStay(String(b.id ?? ""), Number(b.days) || 0, Number(b.minutes) || 0);
    return r ? NextResponse.json({ ok: true, row: r }) : NextResponse.json({ ok: false }, { status: 404 });
  }
  if (b.action !== "refund") return NextResponse.json({ ok: false, error: "ไม่รู้จักคำสั่ง" }, { status: 400 });
  const note = String(b.note ?? "").trim().slice(0, 300);
  if (!note) return NextResponse.json({ ok: false, error: "ระบุเหตุผลการคืนเงิน" }, { status: 400 });
  try {
    const row = await adminRefund(String(b.id ?? ""), `admin:${s.email}`, note);
    return NextResponse.json({ ok: true, row });
  } catch (e) {
    if (e instanceof StayError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    console.error("stay refund", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
