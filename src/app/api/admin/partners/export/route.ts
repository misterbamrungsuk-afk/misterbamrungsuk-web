import { NextResponse } from "next/server";
import { PARTNER_PACKAGES, type PartnerPackageKey } from "@/lib/partner/config";
import { STATUS_LABEL, listPartners } from "@/lib/partner/store";
import { allowed } from "../guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // กัน CSV injection
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  if (!(await allowed())) return NextResponse.json({ ok: false }, { status: 401 });
  const head = ["สมัครเมื่อ", "ธุรกิจ", "ประเภท", "จังหวัด", "ผู้ติดต่อ", "โทร", "อีเมล", "LINE", "ลิงก์", "แพ็กเกจ", "สถานะ", "QC", "เริ่ม", "สิ้นสุด", "ยอดชำระ", "ข้อความ", "โน้ต"];
  const rows = (await listPartners()).map((p) => [
    p.created_at, p.business_name, p.type, p.province, p.contact_name, p.tel, p.email, p.line_id, p.links,
    PARTNER_PACKAGES[p.package as PartnerPackageKey]?.label ?? p.package, STATUS_LABEL[p.status], p.qc, p.starts_at, p.ends_at, p.amount, p.message, p.notes,
  ]);
  const csv = "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="partners-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
