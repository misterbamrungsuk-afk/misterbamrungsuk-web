import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { computeMonthlyBonuses, decideMonthlyBonus } from "@/lib/member/recruit-bonus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// โบนัส Recruit รายเดือน: { action: "compute", month? } คำนวณ (ไม่ซ้ำ) · { action: "approve" | "reject", id, note? } เฉพาะ CEO
export async function POST(req: Request) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s || !canAccess(s.role, "/admin/ceo-view")) return NextResponse.json({ ok: false, error: "ไม่มีสิทธิ์" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { action?: string; id?: string; note?: string; month?: string };
  try {
    if (b.action === "compute") return NextResponse.json({ ok: true, created: await computeMonthlyBonuses(b.month || undefined) });
    if (b.action !== "approve" && b.action !== "reject") return NextResponse.json({ ok: false, error: "action" }, { status: 400 });
    if (s.role !== "ceo") return NextResponse.json({ ok: false, error: "เฉพาะ CEO อนุมัติโบนัสได้" }, { status: 403 });
    return NextResponse.json({ ok: true, bonus: await decideMonthlyBonus(String(b.id ?? ""), b.action === "approve", s.email, String(b.note ?? "")) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message || "ไม่สำเร็จ" }, { status: 400 });
  }
}
