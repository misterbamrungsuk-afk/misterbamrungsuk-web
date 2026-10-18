import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { mfaEnforced } from "@/lib/admin-mfa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// middleware โหมดเดโมถามที่นี่ว่าเปิดบังคับ 2 ชั้นไหม (เว็บจริง middleware อ่านไฟล์นโยบายใน Storage เอง)
export async function GET() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ enforce: await mfaEnforced().catch(() => false) }, { headers: { "cache-control": "no-store" } });
}
