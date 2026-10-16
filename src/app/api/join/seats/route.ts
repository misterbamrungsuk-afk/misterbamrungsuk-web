import { NextResponse } from "next/server";
import { CLOSE_AT } from "@/lib/join/config";
import { nextCohortSeats } from "@/lib/join/cohorts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ที่นั่งคงเหลือของกลุ่มอบรมถัดไป (นับจริงจากกลุ่มที่แอดมินเปิดรับ) สำหรับ badge บนหน้าเว็บ */
export async function GET() {
  const s = await nextCohortSeats();
  return NextResponse.json({ left: s.left, quota: s.quota, cohort: s.cohort, closed: s.full || Date.now() > Date.parse(CLOSE_AT) });
}
