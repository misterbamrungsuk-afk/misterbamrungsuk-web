import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { createCohort, deleteCohort, listCohorts, updateCohort, type CohortStatus } from "@/lib/join/cohorts";

export const runtime = "nodejs";

async function allowed() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return !!s && canAccess(s.role, "/admin/cohorts");
}

export async function GET() {
  if (!(await allowed())) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, cohorts: await listCohorts() });
}

export async function POST(req: Request) {
  if (!(await allowed())) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { name?: string; date_text?: string; venue?: string; sessions?: number; capacity?: number; status?: CohortStatus };
  if (!b.name?.trim()) return NextResponse.json({ ok: false, error: "กรอกชื่อกลุ่ม" }, { status: 400 });
  if (b.status && !["done", "open", "draft"].includes(b.status)) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const cohort = await createCohort({ ...b, name: b.name, sessions: Number(b.sessions) || 5, capacity: Number(b.capacity) || 50 });
    return NextResponse.json({ ok: true, cohort });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error)?.message ?? e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await allowed())) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { key?: string; name?: string; date_text?: string; venue?: string; sessions?: number; capacity?: number; status?: CohortStatus };
  if (!b.key) return NextResponse.json({ ok: false, error: "ไม่พบกลุ่ม" }, { status: 400 });
  if (b.status && !["done", "open", "draft"].includes(b.status)) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const cohort = await updateCohort(b.key, { ...b, sessions: Number(b.sessions) || undefined, capacity: Number(b.capacity) || undefined });
    return NextResponse.json({ ok: true, cohort });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error)?.message ?? e) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (!(await allowed())) return NextResponse.json({ ok: false }, { status: 401 });
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ ok: false, error: "ไม่พบกลุ่ม" }, { status: 400 });
  try { await deleteCohort(key); return NextResponse.json({ ok: true }); }
  catch (e) { return NextResponse.json({ ok: false, error: String((e as Error)?.message ?? e) }, { status: 409 }); }
}
