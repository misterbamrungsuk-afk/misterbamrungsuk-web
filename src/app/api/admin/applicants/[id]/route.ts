import { NextResponse } from "next/server";
import { ensureReceiptNo, extraOf, getById, listApplicants, saveProfile, setKyc, setTier, updateApplicant, updateExtra, type Applicant, type ApplicantStatus, type KycReason } from "@/lib/join/store";
import { listCohorts } from "@/lib/join/cohorts";
import { appendToSheet } from "@/lib/join/sheets";
import { FIX_KEYS } from "@/lib/join/fixes";
import { linkMinters } from "@/lib/admin/link-minters";

import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession, type AdminRole } from "@/lib/admin-auth";

async function session() { return verifySession((await cookies()).get(ADMIN_COOKIE)?.value); }
async function role(): Promise<AdminRole | null> { return (await session())?.role ?? null; }

export const runtime = "nodejs";

const STATUSES: ApplicantStatus[] = ["pending_slip", "verified", "rejected", "refunded"];

type Body = {
  listed?: boolean; status?: ApplicantStatus; sync?: boolean; cohort?: string | null; line_joined?: boolean;
  tier?: "top" | "silver" | "secret"; secret_price?: number | null; reason?: string;
  kyc_status?: "approved" | "rejected"; kyc_reason?: Partial<Record<string, string>> | null;
};

// แอดมินเปลี่ยนสถานะ (ยืนยันสลิป/ปฏิเสธ/คืนเงิน) จัดกลุ่ม/LINE sync ชีต หรือตัดสิน KYC
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await role();
  if (!r) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Body;

  // บัญชีรับเงินใหม่ (Part-Time ที่อนุมัติแล้วเปลี่ยนบัญชี): อนุมัติ = ใช้บัญชีใหม่ ถอนได้ · ไม่อนุมัติ = คืนบัญชีเดิม
  if ((body as { bank_review?: string }).bank_review !== undefined) {
    if (!canAccess(r, "/admin/kyc")) return NextResponse.json({ ok: false, error: "เฉพาะฝ่าย KYC" }, { status: 403 });
    const cur = await getById(id);
    const br = cur ? extraOf(cur).bank_review : null;
    if (!cur || !br) return NextResponse.json({ ok: false, error: "ไม่มีคำขอเปลี่ยนบัญชี" }, { status: 409 });
    const ok = (body as { bank_review?: string }).bank_review === "approved";
    await saveProfile(cur.id, ok ? { bank_review: null } : { bank_review: null, bank: br.prev.bank, bank_account: br.prev.bank_account, bank_account_name: br.prev.bank_account_name, bank_book_path: br.prev.bank_book_path });
    await import("@/lib/bookings").then((m) => m.notify({ user_type: "parttime", user_id: cur.id, kind: "bank_review", title: ok ? "บัญชีรับเงินใหม่ผ่านการตรวจแล้ว · ถอนเงินได้" : "บัญชีรับเงินใหม่ไม่ผ่าน · ใช้บัญชีเดิมต่อ", body: ok ? null : "ชื่อบัญชีต้องตรงกับชื่อในบัตรประชาชน · ติดต่อทีมงานทาง LINE", url: `/join/profile/${cur.mb_code}/settings` })).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  // ตัดสินเอกสาร: อนุมัติ หรือตีกลับรายการที่ต้องแก้ (สลิป รูป ข้อมูล บัตร บัญชี) — ฝ่าย KYC หรือผู้ดูแลผู้สมัคร
  if (body.kyc_status !== undefined) {
    // ตัดสิน KYC = ฝ่าย KYC/super/CEO เท่านั้น (ฝ่ายการเงินไม่ได้) · คนที่ออกลิงก์เข้าโปรไฟล์ให้ผู้สมัครคนนี้ภายใน 30 วัน อนุมัติเองไม่ได้ (แยกหน้าที่ กันแก้บัญชีรับเงิน+อนุมัติคนเดียว)
    if (!canAccess(r, "/admin/kyc")) return NextResponse.json({ ok: false, error: "ตัดสิน KYC ได้เฉพาะฝ่าย KYC" }, { status: 403 });
    const me = await session();
    const cur = await getById(id);
    // เทียบกับทุกคนที่เคยออกลิงก์ใน 30 วัน (ไม่ใช่แค่คนล่าสุด) · อีเมลตัวพิมพ์เล็ก
    const mine = !!me && !!cur && linkMinters(cur).some((m) => m.email === me.email.trim().toLowerCase());
    if (body.kyc_status === "approved" && r !== "ceo" && mine)
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
    let row = await setKyc(id, body.kyc_status, reason);
    if (row && body.kyc_status === "approved") row = await autoList(row);
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
    // วันเปิดรับงาน (ครั้งแรก) — นับ 30 วันสำหรับโค้ดโปรโมทฟรี
    await saveProfile(cur.id, body.listed && !x.listed_at ? { listed: true, listed_at: new Date().toISOString() } : { listed: !!body.listed });
    const row = await getById(id);
    return row ? NextResponse.json({ ok: true, row: { ...row, ...extraOf(row) } }) : NextResponse.json({ ok: false }, { status: 404 });
  }
  if (body.tier !== undefined) {
    if (body.tier !== "top" && body.tier !== "silver" && body.tier !== "secret") return NextResponse.json({ ok: false }, { status: 400 });
    // Secret: ราคา 3 ชม. รายคน (บาท) · ไม่ส่ง = คงเดิม · null/0 = ใช้ราคา TOP
    const sp = body.secret_price === undefined ? undefined : body.secret_price === null ? null : Math.round(Number(body.secret_price));
    if (sp !== undefined && sp !== null && (!Number.isFinite(sp) || sp < 0 || sp > 1_000_000)) return NextResponse.json({ ok: false, error: "ราคาไม่ถูกต้อง" }, { status: 400 });
    const row = await setTier(id, body.tier, sp === 0 ? null : sp);
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
  // ปฏิเสธสลิป = ต้องมีเหตุผล (ผู้สมัครเห็นในแจ้งเตือน จะได้รู้ว่าต้องส่งอะไรใหม่)
  const reason = String(body.reason ?? "").trim().slice(0, 300);
  if (body.status === "rejected" && !reason) return NextResponse.json({ ok: false, error: "ระบุเหตุผลที่ปฏิเสธสลิป" }, { status: 400 });
  let row = await updateApplicant(id, { status: body.status });
  // อนุมัติสลิป → ออกเลขใบเสร็จรับเงิน RI (ครั้งเดียว)
  if (row && body.status === "verified") { await ensureReceiptNo(row).catch((e) => console.error("ri_no", (e as Error)?.message)); row = (await getById(id)) ?? row; row = await autoList(row); }
  if (row && body.status === "rejected") {
    const by = (await session())?.email ?? "";
    // slip_reject ต้องเพิ่มใน store.ts (EXTRA_ONLY_KEYS) — ก่อนนั้นบันทึกไม่ได้ก็ไม่ให้ล้ม (เหตุผลยังไปถึงผู้สมัครทางแจ้งเตือน)
    await saveProfile(row.id, { slip_reject: { reason, by, at: new Date().toISOString() } }).catch((e) => console.error("slip_reject", (e as Error)?.message));
    await import("@/lib/bookings").then((m) => m.notify({ user_type: "parttime", user_id: row.id, kind: "slip_rejected", title: "สลิปชำระเงินไม่ผ่านการตรวจ", body: reason, url: `/join/profile/${row.mb_code}` })).catch(() => {});
  }
  return row ? NextResponse.json({ ok: true, row: { ...row, ...extraOf(row) } }) : NextResponse.json({ ok: false }, { status: 404 });
}

/** อนุมัติ KYC แล้ว → เปิดแสดงบนหน้าแรกอัตโนมัติ (บอสสั่ง 22 ต.ค. 2569)
 *  เงื่อนไขเดียวกับสวิตช์ "แสดงบนหน้าแรก": ชำระแล้ว + ผ่าน KYC + มีรูปโปรไฟล์ · ทำครั้งแรกเท่านั้น (เคยเปิดแล้ว = ไม่ทับที่แอดมินปิดไว้) */
async function autoList(row: Applicant): Promise<Applicant> {
  const x = extraOf(row);
  if (x.listed || x.listed_at || row.status !== "verified" || x.kyc_status !== "approved" || !(x.photos?.length || row.docs.photo)) return row;
  await saveProfile(row.id, { listed: true, listed_at: new Date().toISOString() });
  return (await getById(row.id)) ?? row;
}
