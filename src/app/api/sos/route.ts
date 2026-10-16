import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentCustomer, rateLimited } from "@/lib/customer/auth";
import { currentParttime } from "@/lib/bookings/auth";
import { RESUME_COOKIE, readResume } from "@/lib/join/resume";
import { addEvent, listForCustomer, listForParttime, notify, type Booking } from "@/lib/bookings";
import { sendEmail } from "@/lib/email";
import { ISSUER } from "@/lib/join/legal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOTLINE = { police: "191", medical: "1669", tourist: "1155" };
const esc = (s: string) => s.replace(/[<>&"]/g, "");

// POST /api/sos — แจ้งเหตุฉุกเฉินจริง: บันทึกเข้าแจ้งเตือนแอดมิน (+ push ถึงแอดมินที่เปิดรับ) + อีเมล + ผูกกับนัดที่กำลังดำเนินอยู่
// body: { lat?, lng?, mb?, t? } — ลูกค้าใช้ session · Part-Time ใช้ mb+t หรือ cookie resume · ไม่ได้ล็อกอินก็ส่งได้ (ไม่ปฏิเสธเหตุฉุกเฉิน)
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (rateLimited(`sos:${ip}`, 6, 10 * 60_000)) return NextResponse.json({ ok: true, hotline: HOTLINE, note: "รับเรื่องแล้ว" });
  const b = (await req.json().catch(() => ({}))) as { lat?: unknown; lng?: unknown; mb?: string; t?: string };
  const lat = Number(b.lat), lng = Number(b.lng);
  const hasLoc = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  let who = "ผู้ใช้ที่ไม่ได้เข้าสู่ระบบ", actor = `anon:${ip}`;
  let bookings: Booking[] = [];
  const me = await currentCustomer().catch(() => null);
  if (me) {
    who = `ลูกค้า ${me.email ?? me.sub}`; actor = `customer:${me.sub}`;
    bookings = await listForCustomer(me.sub).catch(() => []);
  } else {
    const mb = b.mb || readResume((await cookies()).get(RESUME_COOKIE)?.value) || "";
    const a = mb ? await currentParttime(String(mb), b.t ? String(b.t) : null).catch(() => null) : null;
    if (a) { who = `Part-Time ${a.nickname || a.first_name} (${a.mb_code}) โทร ${a.tel ?? "-"}`; actor = `parttime:${a.id}`; bookings = await listForParttime(a.id).catch(() => []); }
  }
  // นัดที่กำลังดำเนินอยู่ (ยืนยันแล้ว/เช็กอิน) ใกล้เวลานี้ ±12 ชม.
  const now = Date.now();
  const live = bookings.find((x) => ["accepted", "checked_in", "cancel_requested", "disputed"].includes(x.status) && Math.abs(Date.parse(x.starts_at) - now) < 12 * 3600_000);
  const map = hasLoc ? `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}` : "";
  const at = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
  const lines = [who, live ? `นัด ${live.code} · ${live.place.label} ${live.place.detail} · ${live.parttime_nick ?? ""} / ${live.customer_name ?? live.customer_email ?? ""}` : "ไม่มีนัดที่กำลังดำเนินอยู่", hasLoc ? `ตำแหน่ง ${map}` : "ไม่ได้แชร์ตำแหน่ง", `เวลา ${at}`];

  await notify({ user_type: "admin", user_id: "sos", kind: "sos", title: `🚨 SOS · ${who}`, body: lines.join(" · ").slice(0, 900), url: live ? "/admin/orders" : "/admin/audit" });
  if (live) await addEvent(live.id, "sos", actor, { lat: hasLoc ? lat : null, lng: hasLoc ? lng : null }).catch(() => {});
  const to = process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL || ISSUER.email;
  void sendEmail({ to, subject: `🚨 SOS Mister Bamrungsuk · ${at}`, html: `<div style="font-family:Tahoma,sans-serif"><h2 style="color:#c9283d">SOS ฉุกเฉิน</h2>${lines.map((l) => `<p>${esc(l)}</p>`).join("")}${map ? `<p><a href="${map}">เปิดแผนที่</a></p>` : ""}</div>` }).catch(() => {});
  console.error("[SOS]", lines.join(" | "));
  return NextResponse.json({ ok: true, hotline: HOTLINE, booking: live?.code ?? null });
}
