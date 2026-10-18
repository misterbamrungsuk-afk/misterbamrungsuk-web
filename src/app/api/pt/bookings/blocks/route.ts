import { NextResponse } from "next/server";
import { currentParttime } from "@/lib/bookings/auth";
import { blockedOf, unblock } from "@/lib/bookings/blocks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ลูกค้าที่ Part-Time บล็อกไว้ (หน้าตั้งค่า) — ไม่ส่งรหัสลูกค้า มีแค่ชื่อเล่น + เลขนัดที่บล็อก + เวลา
export async function GET(req: Request) {
  const u = new URL(req.url);
  const a = await currentParttime(String(u.searchParams.get("mb") ?? ""), u.searchParams.get("t"));
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  return NextResponse.json({ ok: true, blocks: blockedOf(a).map(({ h, name, code, at }) => ({ h, name, code, at })) }, { headers: { "Cache-Control": "no-store" } });
}

// POST { mb, t?, action: "unblock", h } → เลิกบล็อก
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { mb?: string; t?: string; action?: string; h?: string };
  const a = await currentParttime(String(b.mb ?? ""), b.t);
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  if (b.action !== "unblock" || !/^[0-9a-f]{24}$/.test(String(b.h ?? ""))) return NextResponse.json({ ok: false, error: "คำขอไม่ถูกต้อง" }, { status: 400 });
  const done = await unblock(a, String(b.h));
  return done ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "ไม่พบรายการนี้ (อาจเลิกบล็อกไปแล้ว)" }, { status: 404 });
}
