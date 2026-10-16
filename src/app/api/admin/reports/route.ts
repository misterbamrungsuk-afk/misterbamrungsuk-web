import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { closeReport } from "@/lib/reports";

export const runtime = "nodejs";

// ปิดเรื่องรายงานผู้ใช้: POST { id, note }
export async function POST(req: Request) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s || !canAccess(s.role, "/admin/reports")) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; note?: string };
  if (!/^[0-9a-f-]{36}$/.test(String(b.id ?? ""))) return NextResponse.json({ ok: false }, { status: 400 });
  await closeReport(String(b.id), `${String(b.note ?? "").slice(0, 280)} · ${s.email}`);
  return NextResponse.json({ ok: true });
}
