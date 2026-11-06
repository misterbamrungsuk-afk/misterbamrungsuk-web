import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { cleanPlan } from "@/lib/finance/plan";
import { saveFinancePlan } from "@/lib/finance/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// บันทึกแผนการเงิน (/finance) — CEO / Super / การเงิน
export async function POST(req: Request) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s || !canAccess(s.role, "/finance")) return NextResponse.json({ ok: false, error: "ไม่มีสิทธิ์" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { plan?: unknown; note?: unknown };
  try {
    const plan = await saveFinancePlan(cleanPlan(b.plan), s.email, String(b.note ?? "").trim().slice(0, 120) || "แก้ไขแผน");
    return NextResponse.json({ ok: true, plan });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" }, { status: 400 });
  }
}
