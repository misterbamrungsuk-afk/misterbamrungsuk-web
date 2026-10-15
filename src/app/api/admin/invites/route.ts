import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { createInvite, isCode, listInvites, setInviteEnabled } from "@/lib/join/invites";

export const runtime = "nodejs";

// ลิงก์เชิญ (บอร์ด AdminInvites) — Super admin / การเงิน
async function session() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return s && canAccess(s.role, "/admin/invites") ? s : null;
}
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function GET() {
  if (!(await session())) return bad("ไม่มีสิทธิ์", 401);
  return NextResponse.json({ ok: true, data: await listInvites() }, { headers: { "Cache-Control": "no-store" } });
}

/** สร้างลิงก์ใหม่: { name, limit (null = ไม่จำกัด), expires: YYYY-MM-DD } */
export async function POST(req: Request) {
  const s = await session();
  if (!s) return bad("ไม่มีสิทธิ์", 401);
  const b = (await req.json().catch(() => null)) as { name?: string; limit?: number | null; expires?: string } | null;
  const name = String(b?.name ?? "").trim().slice(0, 60);
  const limit = b?.limit === null || b?.limit === undefined ? null : Number(b.limit);
  const expires = String(b?.expires ?? "");
  if (!name) return bad("กรอกชื่อ / โน้ตของลิงก์");
  if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 1000)) return bad("จำนวนครั้งต้องเป็น 1–1,000 หรือไม่จำกัด");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expires) || Number.isNaN(Date.parse(expires))) return bad("เลือกวันหมดอายุ");
  if (Date.parse(`${expires}T23:59:59+07:00`) < Date.now()) return bad("วันหมดอายุต้องไม่ใช่วันที่ผ่านมาแล้ว");
  try {
    return NextResponse.json({ ok: true, data: await createInvite(name, limit, expires, s.email) });
  } catch (e) {
    console.error("create invite failed", e);
    return bad("บันทึกไม่สำเร็จ", 500);
  }
}

/** เปิด/ปิดลิงก์: { code, enabled } */
export async function PATCH(req: Request) {
  if (!(await session())) return bad("ไม่มีสิทธิ์", 401);
  const b = (await req.json().catch(() => null)) as { code?: string; enabled?: boolean } | null;
  const code = String(b?.code ?? "").toUpperCase();
  if (!isCode(code)) return bad("รหัสลิงก์ไม่ถูกต้อง");
  const r = await setInviteEnabled(code, !!b?.enabled).catch(() => null);
  return r ? NextResponse.json({ ok: true, data: r }) : bad("ไม่พบลิงก์", 404);
}
