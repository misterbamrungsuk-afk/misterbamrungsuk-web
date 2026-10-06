import { NextResponse } from "next/server";
import { PACKAGE_KEYS, type PartnerPackageKey } from "@/lib/partner/config";
import { PARTNER_STATUSES, QC_STATES, endDateFor, listPartners, updatePartner, type PartnerPatch, type PartnerQc, type PartnerStatus } from "@/lib/partner/store";
import { allowed } from "../guard";

export const runtime = "nodejs";
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

// แอดมินเปลี่ยนสถานะ / QC / แพ็กเกจ+วันเริ่ม (คำนวณวันจบให้) / ยอดชำระ / โน้ต
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
  if (b.notes !== undefined) patch.notes = typeof b.notes === "string" ? b.notes.slice(0, 2000) : null;
  if (!Object.keys(patch).length) return fail("empty");
  const row = await updatePartner(id, patch);
  return row ? NextResponse.json({ ok: true, row }) : fail("not found", 404);
}
