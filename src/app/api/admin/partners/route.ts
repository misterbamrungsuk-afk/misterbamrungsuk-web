import { NextResponse } from "next/server";
import { listPartners } from "@/lib/partner/store";
import { allowed } from "./guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await allowed())) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, rows: await listPartners() });
}
