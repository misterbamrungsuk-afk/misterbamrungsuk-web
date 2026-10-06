import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listStrikes, noshowDemo } from "@/lib/noshow";

export const runtime = "nodejs";

// ใบเตือนของ Part-Time (?provider=<id>) — ยังไม่มีระบบล็อกอิน Part-Time แยก จึงรับ id จากหน้าแอป (ต้องมี session)
export async function GET(req: Request) {
  if (!(await cookies()).get("hamoo_session")?.value) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const provider = (new URL(req.url).searchParams.get("provider") ?? "").slice(0, 60);
  if (!provider) return NextResponse.json({ ok: false, error: "provider required" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, demo: noshowDemo(), strikes: await listStrikes(provider) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("provider strikes", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
