import { NextResponse } from "next/server";
import { nextCohortSeats } from "@/lib/join/cohorts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ที่นั่งคงเหลือของกลุ่มอบรมถัดไป (นับจริงจากกลุ่มที่แอดมินเปิดรับ) สำหรับ badge บนหน้าเว็บ */
export async function GET(req: Request) {
  const s = await nextCohortSeats(new URL(req.url).searchParams.get("g") === "tom" ? "tom" : null);
  return NextResponse.json({ left: s.left, quota: s.quota, taken: s.taken, cohort: s.cohort, closed: false }); // รับสมัครตลอด (บอส 11 พ.ย. 2569)
}
