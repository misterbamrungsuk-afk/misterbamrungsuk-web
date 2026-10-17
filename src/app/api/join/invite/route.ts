import { NextResponse } from "next/server";
import { limited as dbLimited } from "@/lib/rate-limit";
import { findInvite } from "@/lib/join/invites";

export const runtime = "nodejs";

// ตรวจลิงก์เชิญ (สาธารณะ) — คืนสถานะเท่านั้น ไม่เปิดเผยจำนวนครั้ง/ผู้สร้าง
export async function GET(req: Request) {
  if (await dbLimited(`inv:${(req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim()}`, 20, 15 * 60_000)) return Response.json({ ok: false, error: "ลองบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  const code = new URL(req.url).searchParams.get("code") ?? "";
  const { state } = await findInvite(code);
  return NextResponse.json({ ok: state === "ok", state }, { headers: { "Cache-Control": "no-store" } });
}
