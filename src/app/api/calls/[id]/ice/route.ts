import { NextResponse } from "next/server";
import { callFor, iceServers } from "@/lib/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?as=&mb=&t= → iceServers สำหรับ RTCPeerConnection · เฉพาะคู่สายของสายที่ยังไม่จบ
// STUN ของ Google เสมอ + TURN ชั่วคราวของ Cloudflare (อายุ 10 นาที) เมื่อตั้ง CLOUDFLARE_TURN_KEY_ID / CLOUDFLARE_TURN_KEY_API_TOKEN
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sp = new URL(req.url).searchParams;
  const x = await callFor((await params).id, { as: sp.get("as"), mb: sp.get("mb"), t: sp.get("t") });
  if (!x) return NextResponse.json({ ok: false }, { status: 404 });
  if (x.c.status !== "ringing" && x.c.status !== "active") return NextResponse.json({ ok: false, error: "สายนี้จบแล้ว" }, { status: 409 });
  return NextResponse.json({ ok: true, ...(await iceServers()) }, { headers: { "Cache-Control": "no-store" } });
}
