import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { clearClientErrors, listClientErrors } from "@/lib/client-errors";

export const runtime = "nodejs";

async function allowed() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return !!s && canAccess(s.role, "/admin/errors");
}

export async function GET() {
  if (!(await allowed())) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, rows: await listClientErrors() });
}

export async function DELETE() {
  if (!(await allowed())) return NextResponse.json({ ok: false }, { status: 401 });
  await clearClientErrors();
  return NextResponse.json({ ok: true });
}
