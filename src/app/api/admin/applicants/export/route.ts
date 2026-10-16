import { csvCell } from "@/lib/csv";
import { listApplicants } from "@/lib/join/store";
import { COLUMNS, applicantRow } from "@/lib/join/sheets";

import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";

async function allowed() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return !!s && canAccess(s.role, "/admin/applicants");
}

export const runtime = "nodejs";

const esc = (v: unknown) => csvCell(v, true); // กันสูตร Excel (CSV injection)

/** ส่งออก CSV (UTF-8 BOM ให้ Excel อ่านภาษาไทยได้) */
export async function GET() {
  if (!(await allowed())) return new Response("unauthorized", { status: 401 });
  const rows = await listApplicants();
  const lines = rows.map((r) => applicantRow(r).map(esc).join(","));
  return new Response("\uFEFF" + [COLUMNS.map(esc).join(","), ...lines].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="mb-applicants-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
