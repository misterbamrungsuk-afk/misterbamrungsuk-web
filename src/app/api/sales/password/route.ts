import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { limited } from "@/lib/rate-limit";
import { SALES_COOKIE, readSalesLink } from "@/lib/member";
import { findRep } from "@/lib/member/store";
import { setSalesPassword } from "@/lib/member/recruit";
import { sameOrigin } from "@/lib/switch-confirm";

export const runtime = "nodejs";

// Recruit ตั้ง/เปลี่ยนรหัสผ่านเองในแดชบอร์ด (สมัครเองแล้วเข้าระบบอัตโนมัติ · 28 ต.ค. 2569) · ตั้งครั้งแรกไม่ต้องใส่รหัสเดิม
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const id = readSalesLink((await cookies()).get(SALES_COOKIE)?.value);
  const rep = id ? await findRep({ id }).catch(() => null) : null;
  if (!rep || rep.kind !== "external" || !rep.active) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบใหม่" }, { status: 401 });
  if (await limited(`salespw:${rep.id}`, 10, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ลองบ่อยเกินไป กรุณารอ 15 นาที" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { password?: unknown; current?: unknown };
  try {
    await setSalesPassword(rep.id, String(b.password ?? ""), b.current == null ? undefined : String(b.current));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "ตั้งรหัสผ่านไม่สำเร็จ" }, { status: 400 });
  }
}
