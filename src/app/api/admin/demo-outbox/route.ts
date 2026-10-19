import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { demoOutbox, demoOutboxOn } from "@/lib/email";

export const runtime = "nodejs";

// เดโมเท่านั้น: อ่านอีเมลที่ระบบ "ส่ง" (ไม่มี RESEND_API_KEY และไม่ใช่ Vercel) ให้ชุดทดสอบ e2e ตรวจลิงก์ · บน Vercel / มี Resend = 404
export async function GET(req: Request) {
  if (!demoOutboxOn()) return new NextResponse(null, { status: 404 });
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const to = (new URL(req.url).searchParams.get("to") ?? "").toLowerCase();
  const mails = demoOutbox().filter((m) => !to || m.to.some((x) => x.toLowerCase() === to)).slice(-20);
  return NextResponse.json({ ok: true, mails }, { headers: { "Cache-Control": "no-store" } });
}
