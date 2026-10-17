import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { CodeError, createPromo, listCodes, setActive } from "@/lib/codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function admin() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return s && canAccess(s.role, "/admin/promos") ? s : null;
}
// โค้ดโปรโมชัน: GET = ทั้งหมด (รวมบัตรของขวัญที่ลูกค้าซื้อ) · POST { action: "create", code?, amount (บาท), max_uses, expires_at?, note } | { action: "toggle", code, active }
export async function GET() {
  if (!(await admin())) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, codes: await listCodes().catch(() => []) });
}
export async function POST(req: Request) {
  const s = await admin();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    if (b.action === "toggle") { await setActive(String(b.code ?? ""), !!b.active); return NextResponse.json({ ok: true }); }
    if (b.action === "create") {
      const exp = b.expires_at ? new Date(String(b.expires_at)) : null;
      if (exp && Number.isNaN(+exp)) return NextResponse.json({ ok: false, error: "วันหมดอายุไม่ถูกต้อง" }, { status: 400 });
      const total = Math.round(Number(b.amount) * 100) * Math.max(1, Math.round(Number(b.max_uses) || 1));
      if (total > 500_000 && s.role !== "ceo") return NextResponse.json({ ok: false, error: "โค้ดมูลค่ารวมเกิน ฿5,000 ต้องให้ CEO สร้าง" }, { status: 403 });
      const code = await createPromo(`admin:${s.email}`, { code: b.code ? String(b.code) : undefined, amount_satang: Math.round(Number(b.amount) * 100), max_uses: Math.round(Number(b.max_uses) || 1), expires_at: exp ? exp.toISOString() : null, note: String(b.note ?? "") });
      return NextResponse.json({ ok: true, code });
    }
    return NextResponse.json({ ok: false, error: "action" }, { status: 400 });
  } catch (e) {
    if (e instanceof CodeError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("admin promos", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
