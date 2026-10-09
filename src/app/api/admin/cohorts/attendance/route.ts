import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { extraOf, listApplicants, markAttendance } from "@/lib/join/store";

export const runtime = "nodejs";

async function allowed() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return !!s && canAccess(s.role, "/admin/cohorts");
}

// เช็กชื่อรายคน {applicant_id, session, present} หรือทั้งกลุ่ม {cohort, session, present}
export async function POST(req: Request) {
  if (!(await allowed())) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { applicant_id?: string; cohort?: string; session?: number; present?: boolean };
  const session = Number(b.session);
  if (!Number.isInteger(session) || session < 1 || session > 10 || typeof b.present !== "boolean") return NextResponse.json({ ok: false }, { status: 400 });
  try {
    if (b.applicant_id) {
      await markAttendance(b.applicant_id, session, b.present);
      return NextResponse.json({ ok: true, count: 1 });
    }
    if (b.cohort) {
      const ids = (await listApplicants("verified")).filter((a) => extraOf(a).cohort === b.cohort).map((a) => a.id);
      for (const id of ids) await markAttendance(id, session, b.present);
      return NextResponse.json({ ok: true, count: ids.length });
    }
    return NextResponse.json({ ok: false }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error)?.message ?? e) }, { status: 500 });
  }
}
