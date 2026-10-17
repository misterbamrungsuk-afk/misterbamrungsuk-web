import { NextResponse } from "next/server";
import { extraOf, getById, listApplicants, saveProfile, setKyc, setTier, updateApplicant, updateExtra, type ApplicantStatus, type KycReason } from "@/lib/join/store";
import { listCohorts } from "@/lib/join/cohorts";
import { appendToSheet } from "@/lib/join/sheets";
import { FIX_KEYS } from "@/lib/join/fixes";

import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession, type AdminRole } from "@/lib/admin-auth";

async function session() { return verifySession((await cookies()).get(ADMIN_COOKIE)?.value); }
async function role(): Promise<AdminRole | null> { return (await session())?.role ?? null; }

export const runtime = "nodejs";

const STATUSES: ApplicantStatus[] = ["pending_slip", "verified", "rejected", "refunded"];

type Body = {
  listed?: boolean; status?: ApplicantStatus; sync?: boolean; cohort?: string | null; line_joined?: boolean;
  tier?: "top" | "silver";
  kyc_status?: "approved" | "rejected"; kyc_reason?: Partial<Record<string, string>> | null;
};

// แอดมินเปลี่ยนสถานะ (ยืนยันสลิป/ปฏิเสธ/คืนเงิน) จัดกลุ่ม/LINE sync ชีต หรือตัดสิน KYC
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await role();
  if (!r) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Body;

  // ตัดสินเอกสาร: อนุมัติ หรือตีกลับรายการที่ต้องแก้ (สลิป รูป ข้อมูล บัตร บัญชี) — ฝ่าย KYC หรือผู้ดูแลผู้สมัคร
  if (body.kyc_status !== undefined) {
    // ตัดสิน KYC = ฝ่าย KYC/super/CEO เท่านั้น (ฝ่ายการเงินไม่ได้) · คนที่ออกลิงก์เข้าโปรไฟล์ให้ผู้สมัครคนนี้ภายใน 30 วัน อนุมัติเองไม่ได้ (แยกหน้าที่ กันแก้บัญชีรับเงิน+อนุมัติคนเดียว)
    if (!canAccess(r, "/admin/kyc")) return NextResponse.json({ ok: false, error: "ตัดสิน KYC ได้เฉพาะฝ่าย KYC" }, { status: 403 });
    const me = await session();
    const cur = await getById(id);
    const lb = cur ? extraOf(cur).link_by : null;
    if (body.kyc_status === "approved" && r !== "ceo" && lb && me && lb.email === me.email && Date.now() - Date.parse(lb.at) < 30 * 86400_000)
      return NextResponse.json({ ok: false, error: "คุณเป็นคนออกลิงก์เข้าโปรไฟล์ให้ผู้สมัครคนนี้ · ให้แอดมินคนอื่นอนุมัติ KYC" }, { status: 403 });
    if (body.kyc_status !== "approved" && body.kyc_status !== "rejected") return NextResponse.json({ ok: false }, { status: 400 });
    let reason: KycReason | null = null;
    if (body.kyc_status === "rejected") {
      reason = {};
      for (const k of FIX_KEYS) {
        const v = body.kyc_reason?.[k];
        if (typeof v === "string" && v.trim()) reason[k] = v.trim().slice(0, 300);
      }
      if (!Object.keys(reason).length) return NextResponse.json({ ok: false, error: "ระบุรายการที่ไม่ผ่านอย่างน้อย 1 รายการ" }, { status: 400 });
    }
    const row = await setKyc(id, body.kyc_status, reason);
    return row ? NextResponse.json({ ok: true, row: { ...row, ...extraOf(row) } }) : NextResponse.json({ ok: false }, { status: 404 });
  }

  if (!canAccess(r, "/admin/applicants")) return NextResponse.json({ ok: false }, { status: 401 });
  // ระดับ TOP / Silver (หลังอบรม) → ราคาบนการ์ดโปรไฟล์ผู้สมัคร
  if (body.listed !== undefined) {
    const cur = await getById(id);
    if (!cur) return NextResponse.json({ ok: false }, { status: 404 });
    const x = extraOf(cur);
    if (body.listed && (cur.status !== "verified" || x.kyc_status !== "approved" || !(x.photos?.length || cur.docs.photo)))
      return NextResponse.json({ ok: false, error: "แสดงได้เมื่อชำระแล้ว ผ่าน KYC และมีรูปโปรไฟล์" }, { status: 400 });
    await saveProfile(cur.id, { listed: !!body.listed });
    const row = await getById(id);
    return row ? NextResponse.json({ ok: true, row: { ...row, ...extraOf(row) } }) : NextResponse.json({ ok: false }, { status: 404 });
  }
  if (body.tier !== undefined) {
    if (body.tier !== "top" && body.tier !== "silver") return NextResponse.json({ ok: false }, { status: 400 });
    const row = await setTier(id, body.tier);
    return row ? NextResponse.json({ ok: true, row: { ...row, ...extraOf(row) } }) : NextResponse.json({ ok: false }, { status: 404 });
  }
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
