import { NextResponse } from "next/server";
import { listAll } from "@/lib/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// รอบรายวัน: หมดเวลาตอบรับ → คืนเงิน · จบงานอัตโนมัติ · ปล่อยรายได้ที่ครบเวลา (ปกติทำตอนมีคนเปิดหน้าอยู่แล้ว รอบนี้กันค้าง)
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const rows = await listAll(1000);
    return NextResponse.json({ ok: true, checked: rows.length });
  } catch (e) {
    console.error("cron money", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
