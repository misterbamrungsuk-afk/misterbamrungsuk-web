import { NextResponse } from "next/server";
import { findInvite } from "@/lib/join/invites";

export const runtime = "nodejs";

// ตรวจลิงก์เชิญ (สาธารณะ) — คืนสถานะเท่านั้น ไม่เปิดเผยจำนวนครั้ง/ผู้สร้าง
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code") ?? "";
  const { state } = await findInvite(code);
  return NextResponse.json({ ok: state === "ok", state }, { headers: { "Cache-Control": "no-store" } });
}
