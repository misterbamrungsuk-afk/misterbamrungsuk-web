import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { bookingActor } from "@/lib/bookings/auth";
import { BookingError } from "@/lib/bookings";
import { deleteChatBox, demoAgeMessage, hideChat, hideMessage, unhideChat, unsendMessage } from "@/lib/bookings/chat-manage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// จัดการแชทของฉัน (ลูกค้า = เซสชัน · Part-Time = mb + t) — ไม่ลบข้อความจริง ทีมงานยังเห็นครบ
// POST { action: unsend|delete (message_id) | hide|unhide|delete_box, mb?, t? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const b = (await req.json().catch(() => ({}))) as { action?: string; message_id?: number; mb?: string; t?: string; hours?: number };
  const who = await bookingActor((await params).id, b.mb, b.t);
  if (!who) return NextResponse.json({ ok: false, error: "ไม่พบแชทนี้" }, { status: 404 });
  const me = { role: who.role, id: who.id };
  const mid = Number(b.message_id);
  // ทดสอบ e2e เท่านั้น: โหมดสาธิตทำให้ข้อความเก่าลง (production/ฐานจริง = 404)
  if (b.action === "demo_age") return demoAgeMessage(mid, Number(b.hours) || 0) ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false }, { status: 404 });
  if (await limited(`chatman:${who.role}:${who.id}`, 60, 60_000)) return NextResponse.json({ ok: false, error: "ทำรายการเร็วเกินไป" }, { status: 429 });
  try {
    switch (b.action) {
      case "unsend": await unsendMessage(me, who.b, mid); break;
      case "delete": await hideMessage(me, who.b, mid); break;
      case "hide": await hideChat(me, who.b); break;
      case "unhide": await unhideChat(me, who.b); break;
      case "delete_box": await deleteChatBox(me, who.b); break;
      default: return NextResponse.json({ ok: false, error: "ไม่รู้จักคำสั่ง" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: e.code === "notfound" ? 404 : e.code === "forbidden" ? 403 : e.code === "off" ? 503 : 409 });
    console.error("chat manage", e);
    return NextResponse.json({ ok: false, error: "ทำรายการไม่สำเร็จ" }, { status: 500 });
  }
}
