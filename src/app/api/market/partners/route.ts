import { NextResponse } from "next/server";
import { marketPartners } from "@/lib/market/partners";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, ...(await marketPartners()) });
}
