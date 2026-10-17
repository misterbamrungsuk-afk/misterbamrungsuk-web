import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { BookingError, getBooking, notify, sendMessage } from "@/lib/bookings";

export const runtime = "nodejs";

const TO = { customer: "ลูกค้า", parttime: "Part-Time", both: "ทั้งสองฝ่าย" } as const;
type To = keyof typeof TO;

// ทีมงานเตือนผู้ใช้ในห้องแชทของนัด: POST { booking_id, to: customer|parttime|both, text }
// ส่งเป็นข้อความ "ระบบ" (ทั้งสองฝ่ายเห็นในห้อง) + แจ้งเตือนฝ่ายที่ถูกเตือน · ไม่ผ่านตัวกรองคำห้าม (ทีมงานส่งเอง)
export async function POST(req: Request) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s || !canAccess(s.role, "/admin/chats")) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { booking_id?: string; to?: string; text?: string };
  const to = (String(b.to ?? "") in TO ? b.to : "") as To | "";
  const text = String(b.text ?? "").trim().slice(0, 500);
  if (!to) return NextResponse.json({ ok: false, error: "เลือกผู้ที่จะเตือน" }, { status: 400 });
  if (text.length < 5) return NextResponse.json({ ok: false, error: "พิมพ์ข้อความเตือนอย่างน้อย 5 ตัวอักษร" }, { status: 400 });
  const bk = await getBooking(String(b.booking_id ?? "")).catch(() => null);
  if (!bk) return NextResponse.json({ ok: false, error: "ไม่พบนัดนี้" }, { status: 404 });
  try {
    const m = await sendMessage(bk, "system", "admin", `⚠ คำเตือนจากทีมงานถึง${TO[to]}: ${text}`);
    const tell = (who: "customer" | "parttime") => notify(who === "customer"
      ? { user_type: "customer", user_id: bk.customer_id, kind: "chat_warning", title: `คำเตือนจากทีมงาน · ${bk.code}`, body: text.slice(0, 120), url: `/chat/${bk.id}` }
      : { user_type: "parttime", user_id: bk.parttime_id, kind: "chat_warning", title: `คำเตือนจากทีมงาน · ${bk.code}`, body: text.slice(0, 120), url: `/join/profile/${bk.parttime_mb}/jobs` });
    if (to !== "parttime") await tell("customer").catch(() => {});
    if (to !== "customer") await tell("parttime").catch(() => {});
    console.info("chat warn", bk.code, to, s.email); // ใครเตือน (ไม่ใส่อีเมลแอดมินในข้อความที่ลูกค้าเห็น)
    return NextResponse.json({ ok: true, message: m });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("chat warn", e);
    return NextResponse.json({ ok: false, error: "ส่งคำเตือนไม่สำเร็จ" }, { status: 500 });
  }
}
