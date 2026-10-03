import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { bookingConfirmed, bookingStatusChanged, sendAll, type BookingMail } from "@/lib/email";
import { clientIp, isEmail, rateLimited } from "@/lib/customer/auth";

export const runtime = "nodejs";

// แจ้งเตือนการจองทางอีเมล — ผู้รับฝั่งลูกค้าอ่านจาก session cookie เท่านั้น (กันใช้เป็นช่องส่งสแปม)
// โหมดเดโม: ไม่มีอีเมลผู้ให้บริการ / ไม่ได้ตั้ง Resend → log อย่างเดียว
export async function POST(req: Request) {
  if (rateLimited(`notify:${clientIp(req)}`, 10, 10 * 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = (k: string, max = 120) => String(b[k] ?? "").slice(0, max);

  let customerEmail: string | undefined;
  const token = (await cookies()).get("hamoo_session")?.value ?? "";
  try {
    const email = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString()).email as string;
    if (isEmail(email)) customerEmail = email;
  } catch { /* session เดโม */ }

  const mail: BookingMail = {
    code: s("code", 40) || "-", providerName: s("providerName") || "-", customerEmail,
    date: s("date", 20), time: s("time", 10), minutes: s("minutes", 6), total: Number(b.total) || undefined, place: s("place"),
  };
  const status = s("status", 40);
  const mails = status ? bookingStatusChanged(mail, status) : bookingConfirmed(mail);
  void sendAll(mails);
  return NextResponse.json({ ok: true, queued: mails.length });
}
