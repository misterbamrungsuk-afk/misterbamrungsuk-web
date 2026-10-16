import { NextResponse } from "next/server";
import { PACKAGE_KEYS, type PartnerPackageKey } from "@/lib/partner/config";
import { PARTNER_STATUSES, QC_STATES, endDateFor, listPartners, updatePartner, type PartnerPatch, type PartnerQc, type PartnerStatus } from "@/lib/partner/store";
import { allowed } from "../guard";
import type { QcStatus } from "@/lib/partner/status";
import { ACCOUNT_STATUSES, CLIP_STATUSES, type AccountStatus, type ClipStatus } from "@/lib/partner/portal-types";

export const runtime = "nodejs";
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

// แอดมินเปลี่ยนสถานะ / QC / แผนโปรโมท+วันเริ่ม (คำนวณวันจบให้) / ยอดชำระ / โน้ต
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await allowed())) return fail("unauthorized", 401);
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: PartnerPatch = {};
  if (b.status !== undefined) {
    if (!PARTNER_STATUSES.includes(b.status as PartnerStatus)) return fail("status");
    patch.status = b.status as PartnerStatus;
  }
  if (b.qc !== undefined) {
    if (!QC_STATES.includes(b.qc as PartnerQc)) return fail("qc");
    patch.qc = b.qc as PartnerQc;
  }
  if (b.package !== undefined) {
    if (!PACKAGE_KEYS.includes(b.package as PartnerPackageKey)) return fail("package");
    patch.package = b.package as PartnerPackageKey;
  }
  if (b.starts_at !== undefined) {
    if (b.starts_at === null || b.starts_at === "") {
      patch.starts_at = null;
      patch.ends_at = null;
    } else if (!isDate(b.starts_at)) return fail("starts_at");
    else {
      const pkg = patch.package ?? (await listPartners()).find((r) => r.id === id)?.package;
      if (!pkg) return fail("not found", 404);
      patch.starts_at = b.starts_at;
      patch.ends_at = endDateFor(b.starts_at, pkg);
    }
  }
  if (b.amount !== undefined) {
    const n = Math.round(Number(b.amount));
    if (!Number.isFinite(n) || n < 0 || n > 100_000_000) return fail("amount");
    patch.amount = n;
  }
  // พอร์ทัล (migration 0002_portal)
  if (b.account_status !== undefined) {
    if (!ACCOUNT_STATUSES.includes(b.account_status as AccountStatus)) return fail("account_status");
    patch.account_status = b.account_status as AccountStatus;
  }
  if (b.clip_status !== undefined) {
    if (b.clip_status !== null && b.clip_status !== "" && !CLIP_STATUSES.includes(b.clip_status as ClipStatus)) return fail("clip_status");
    patch.clip_status = (b.clip_status || null) as ClipStatus | null;
  }
  if (b.clip_note !== undefined) patch.clip_note = typeof b.clip_note === "string" ? b.clip_note.slice(0, 200) || null : null;
  if (b.platform_pct !== undefined) {
    if (b.platform_pct === null || b.platform_pct === "") patch.platform_pct = null;
    else {
      const n = Number(b.platform_pct);
      if (!Number.isFinite(n) || n < 0 || n > 100) return fail("platform_pct");
      patch.platform_pct = Math.round(n * 100) / 100;
    }
  }
  // นัด QC (migration 0005_qc) — passed/failed ซิงก์คอลัมน์ qc เดิมด้วย
  if (b.qc_status !== undefined) {
    if (b.qc_status !== null && !["booked", "passed", "failed"].includes(String(b.qc_status))) return fail("qc_status");
    patch.qc_status = (b.qc_status || null) as QcStatus | null;
    if (b.qc_status === "passed" || b.qc_status === "failed") patch.qc = b.qc_status;
  }
  if (b.notes !== undefined) patch.notes = typeof b.notes === "string" ? b.notes.slice(0, 2000) : null;
  if (!Object.keys(patch).length) return fail("empty");
  const row = await updatePartner(id, patch);
  return row ? NextResponse.json({ ok: true, row }) : fail("not found", 404);
}
