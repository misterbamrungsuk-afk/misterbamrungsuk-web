import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { bookingActor } from "@/lib/bookings/auth";
import { BookingError, sendMessage } from "@/lib/bookings";
import { messagesFor } from "@/lib/bookings/chat-manage";
import { ptBlocks } from "@/lib/bookings/blocks";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const OPEN = ["requested", "accepted", "checked_in", "cancel_requested"];

// แชทของการจอง — ลูกค้า หรือ Part-Time เจ้าของงาน · ข้อความที่มีเบอร์/LINE/ลิงก์ ถูกกัน (blocked) ไม่ส่งถึงอีกฝ่าย
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = new URL(req.url);
  const who = await bookingActor((await params).id, u.searchParams.get("mb"), u.searchParams.get("t"));
  if (!who) return NextResponse.json({ ok: false }, { status: 404 });
  // ข้อความที่ถูกกัน: ผู้ส่งเห็นของตัวเอง อีกฝ่ายไม่เห็น · ไม่รวมที่ฉันลบ/ลบกล่องแชท · ยกเลิกการส่ง = ไม่มีเนื้อความ
  // unsent = id ที่โหลดไปแล้วซึ่งถูกยกเลิกการส่งหลัง poll ก่อน (since = ts ครั้งก่อน) → หน้าเว็บแก้ในที่
  const v = await messagesFor({ role: who.role, id: who.id }, who.b.id, Number(u.searchParams.get("after") ?? 0) || 0, u.searchParams.get("since"));
  return NextResponse.json({ ok: true, role: who.role, status: who.b.status, messages: v.messages, last: v.last, unsent: v.unsent, ts: v.ts });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const b = (await req.json().catch(() => ({}))) as { body?: string; mb?: string; t?: string };
  const who = await bookingActor((await params).id, b.mb, b.t);
  if (!who) return NextResponse.json({ ok: false }, { status: 404 });
  if (!OPEN.includes(who.b.status)) return NextResponse.json({ ok: false, error: "แชทของนัดนี้ปิดแล้ว" }, { status: 409 });
  if (await limited(`msg:${who.role}:${who.id}`, 30, 60_000)) return NextResponse.json({ ok: false, error: "ส่งเร็วเกินไป" }, { status: 429 });
  // Part-Time บล็อกลูกค้าของนัดนี้ = ส่งแชทไม่ได้ทั้งสองฝั่ง
  if (await ptBlocks(who.b.parttime_id, who.b.customer_id)) return NextResponse.json({ ok: false, error: who.role === "customer" ? "เพื่อนคนนี้ไม่รับข้อความจากบัญชีของคุณ" : "คุณบล็อกลูกค้านี้ไว้ · ยกเลิกบล็อกได้ที่ ตั้งค่า › ลูกค้าที่บล็อก", code: "blocked" }, { status: 403 });
  try {
    const m = await sendMessage(who.b, who.role, who.id, String(b.body ?? ""));
    return NextResponse.json({
      ok: true, message: { id: m.id, sender_type: m.sender_type, body: m.body, blocked: m.blocked, created_at: m.created_at },
      warning: m.blocked ? (m.flag?.startsWith("word:") ? "ข้อความนี้มีคำที่ไม่อนุญาตในแชท จึงไม่ถูกส่ง · ฝ่าฝืนซ้ำทีมงานจะตรวจสอบและอาจระงับบัญชี" : "ข้อความนี้มีเบอร์โทร LINE ลิงก์ หรือช่องทางนอกแอป จึงไม่ถูกส่ง · ฝ่าฝืนซ้ำทีมงานจะตรวจสอบและอาจระงับบัญชี") : undefined,
    });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("message", e);
    return NextResponse.json({ ok: false, error: "ส่งไม่สำเร็จ" }, { status: 500 });
  }
}
