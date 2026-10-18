import { NextResponse } from "next/server";
import { currentParttime } from "@/lib/bookings/auth";
import { interestsForPt } from "@/lib/interests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Part-Time ดูคนที่สนใจประกาศ "วันนี้ว่าง" ของตัวเอง (?mb=&t=) → { count, list: [{ label (ชื่อแรกปิดบัง), at }] }
export async function GET(req: Request) {
  const u = new URL(req.url);
  const a = await currentParttime(u.searchParams.get("mb") ?? "", u.searchParams.get("t"));
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  const r = await interestsForPt(a).catch(() => ({ count: 0, list: [] }));
  return NextResponse.json({ ok: true, ...r });
}
