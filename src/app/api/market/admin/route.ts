import { NextResponse } from "next/server";
import { marketAdmin } from "@/lib/market/admin";
import { adminData } from "@/lib/market/admin-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await marketAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await adminData()) });
}
