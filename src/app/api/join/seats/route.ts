import { NextResponse } from "next/server";
import { CLOSE_AT, QUOTA } from "@/lib/join/config";
import { countActive } from "@/lib/join/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ที่นั่งคงเหลือ สำหรับ badge บนหน้าเว็บ */
export async function GET() {
  const left = Math.max(0, QUOTA - (await countActive()));
  const closed = left === 0 || Date.now() > Date.parse(CLOSE_AT);
  return NextResponse.json({ left, quota: QUOTA, closed });
}
