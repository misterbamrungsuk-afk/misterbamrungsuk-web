import { NextResponse } from "next/server";
import { extraOf, listApplicants, setKyc, updateApplicant, updateExtra, type ApplicantStatus, type KycReason } from "@/lib/join/store";
import { listCohorts } from "@/lib/join/cohorts";
import { appendToSheet } from "@/lib/join/sheets";

import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession, type AdminRole } from "@/lib/admin-auth";

async function role(): Promise<AdminRole | null> {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return s?.role ?? null;
}

export const runtime = "nodejs";

const STATUSES: ApplicantStatus[] = ["pending_slip", "verified", "rejected", "refunded"];
const KYC_ITEMS = ["id_card", "id_copy", "selfie", "cert_doc", "bank"] as const;

type Body = {
  status?: ApplicantStatus; sync?: boolean; cohort?: string | null; line_joined?: boolean;
  kyc_status?: "approved" | "rejected"; kyc_reason?: Partial<Record<(typeof KYC_ITEMS)[number], string>> | null;
};

// แอดมินเปลี่ยนสถานะ (ยืนยันสลิป/ปฏิเสธ/คืนเงิน) จัดกลุ่ม/LINE sync ชีต หรือตัดสิน KYC
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await role();
  if (!r) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Body;

  // ตัดสิน KYC — ฝ่าย KYC หรือผู้ดูแลผู้สมัคร
  if (body.kyc_status !== undefined) {
    if (!canAccess(r, "/admin/kyc") && !canAccess(r, "/admin/applicants")) return NextResponse.json({ ok: false }, { status: 401 });
    if (body.kyc_status !== "approved" && body.kyc_status !== "rejected") return NextResponse.json({ ok: false }, { status: 400 });
    let reason: KycReason | null = null;
    if (body.kyc_status === "rejected") {
      reason = {};
      for (const k of KYC_ITEMS) {
        const v = body.kyc_reason?.[k];
        if (typeof v === "string" && v.trim()) reason[k] = v.trim().slice(0, 300);
      }
      if (!Object.keys(reason).length) return NextResponse.json({ ok: false, error: "ระบุรายการที่ไม่ผ่านอย่างน้อย 1 รายการ" }, { status: 400 });
    }
    const row = await setKyc(id, body.kyc_status, reason);
    return row ? NextResponse.json({ ok: true, row: { ...row, ...extraOf(row) } }) : NextResponse.json({ ok: false }, { status: 404 });
  }

  if (!canAccess(r, "/admin/applicants")) return NextResponse.json({ ok: false }, { status: 401 });
  // จัดกลุ่มอบรม / สถานะกลุ่ม LINE
  if (body.cohort !== undefined || body.line_joined !== undefined) {
    if (body.cohort != null && !(await listCohorts()).some((c) => c.key === body.cohort)) return NextResponse.json({ ok: false }, { status: 400 });
    const patch: { cohort?: string | null; line_joined?: boolean } = {};
    if (body.cohort !== undefined) patch.cohort = body.cohort;
    if (typeof body.line_joined === "boolean") patch.line_joined = body.line_joined;
    const row = await updateExtra(id, patch);
    return row ? NextResponse.json({ ok: true, row: { ...row, ...extraOf(row) } }) : NextResponse.json({ ok: false }, { status: 404 });
  }
  if (body.sync) {
    const row = (await listApplicants()).find((x) => x.id === id);
    if (!row) return NextResponse.json({ ok: false }, { status: 404 });
    const ok = await appendToSheet(row);
    if (ok) await updateApplicant(id, { sheet_synced: true });
    return NextResponse.json({ ok });
  }
  if (!body.status || !STATUSES.includes(body.status)) return NextResponse.json({ ok: false }, { status: 400 });
  const row = await updateApplicant(id, { status: body.status });
  return row ? NextResponse.json({ ok: true, row: { ...row, ...extraOf(row) } }) : NextResponse.json({ ok: false }, { status: 404 });
}
