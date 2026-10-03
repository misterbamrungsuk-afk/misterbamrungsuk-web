import { NextResponse } from "next/server";
import { listApplicants, updateApplicant, type ApplicantStatus } from "@/lib/join/store";
import { appendToSheet } from "@/lib/join/sheets";

import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";

async function allowed() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return !!s && canAccess(s.role, "/admin/applicants");
}

export const runtime = "nodejs";

const STATUSES: ApplicantStatus[] = ["pending_slip", "verified", "rejected", "refunded"];

// แอดมินเปลี่ยนสถานะ (ยืนยันสลิป/ปฏิเสธ/คืนเงิน) หรือสั่ง sync ชีตซ้ำ — middleware ตรวจ session แล้ว
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await allowed())) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { status?: ApplicantStatus; sync?: boolean };
  if (body.sync) {
    const row = (await listApplicants()).find((r) => r.id === id);
    if (!row) return NextResponse.json({ ok: false }, { status: 404 });
    const ok = await appendToSheet(row);
    if (ok) await updateApplicant(id, { sheet_synced: true });
    return NextResponse.json({ ok });
  }
  if (!body.status || !STATUSES.includes(body.status)) return NextResponse.json({ ok: false }, { status: 400 });
  const row = await updateApplicant(id, { status: body.status });
  return row ? NextResponse.json({ ok: true, row }) : NextResponse.json({ ok: false }, { status: 404 });
}
