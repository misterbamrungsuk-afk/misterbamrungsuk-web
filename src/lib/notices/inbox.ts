import "server-only";
import { NextResponse } from "next/server";
import { listNotices, markNoticeRead, markNoticesRead, unreadNotices, type Notice } from "@/lib/bookings";
import { countSubs, demoPushedTo, pushEnabled, saveSub, validSub } from "@/lib/push";

// กล่องแจ้งเตือนของพอร์ทัลพาร์ทเนอร์ / ร้านค้า — route บาง ๆ เรียกใช้ (ตรวจสิทธิ์ที่ route แล้วส่ง user_type + id มา)
type Who = { type: Extract<Notice["user_type"], "partner" | "vendor">; id: string };

/** GET: รายการล่าสุด + จำนวนที่ยังไม่อ่าน + จำนวนอุปกรณ์ที่ผูก push · ?count=1 = นับอย่างเดียว (กระดิ่ง) */
export async function inboxGet(who: Who, req: Request) {
  const countOnly = new URL(req.url).searchParams.get("count") === "1";
  try {
    const unread = await unreadNotices(who.type, who.id);
    if (countOnly) return NextResponse.json({ ok: true, unread });
    const [notices, devices] = await Promise.all([listNotices(who.type, who.id, 100), countSubs(who.type, who.id)]);
    const pushed = demoPushedTo(who.type, who.id);
    return NextResponse.json({ ok: true, unread, notices, devices, push: pushEnabled(), ...(pushed == null ? {} : { pushed }) });
  } catch (e) {
    console.error("inbox", who.type, e);
    return NextResponse.json({ ok: true, unread: 0, notices: [], devices: 0, push: false });
  }
}

/** POST { id } = อ่านรายการนี้ · {} หรือ { all: true } = อ่านทั้งหมด */
export async function inboxPost(who: Who, req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: number; all?: boolean };
  const id = Number(b.id);
  if (b.id != null && !b.all) await markNoticeRead(who.type, who.id, id).catch(() => {});
  else await markNoticesRead(who.type, who.id).catch(() => {});
  return NextResponse.json({ ok: true, unread: await unreadNotices(who.type, who.id).catch(() => 0) });
}

/** POST { sub } = ผูกอุปกรณ์นี้กับพอร์ทัล (sendPush(type, id) จะถึงเครื่องนี้) */
export async function pushBind(who: Who, req: Request) {
  const b = (await req.json().catch(() => ({}))) as { sub?: unknown };
  if (!validSub(b.sub)) return NextResponse.json({ ok: false, error: "ข้อมูลอุปกรณ์ไม่ถูกต้อง" }, { status: 400 });
  try { await saveSub(who.type, who.id, b.sub); }
  catch (e) {
    // ยังไม่รัน supabase/booking/0014_partner_vendor_notices.sql (check user_type) — แจ้งว่ายังไม่เปิด ไม่ใช่ 500
    console.error("push bind", who.type, (e as { message?: string })?.message);
    return NextResponse.json({ ok: false, off: true, error: "ระบบแจ้งเตือนบนเครื่องยังไม่เปิดใช้" }, { status: 503 });
  }
  return NextResponse.json({ ok: true, enabled: pushEnabled() });
}
