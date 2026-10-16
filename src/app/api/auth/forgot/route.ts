import { limited } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { clientIp, customersEnabled, findCustomer, isEmail, signReset } from "@/lib/customer/auth";
import { emailEnabled, sendEmail } from "@/lib/email";

export const runtime = "nodejs";

// ขอลิงก์ตั้งรหัสผ่านใหม่ทางอีเมล — ตอบเหมือนกันทุกกรณี (ไม่บอกว่าอีเมลมีบัญชีหรือไม่) · mail=false = ระบบอีเมลยังไม่เปิด ให้ติดต่อแอดมิน
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await limited(`forgot:${ip}`, 5, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ขอบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { email?: string };
  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 200);
  if (!isEmail(email)) return NextResponse.json({ ok: false, error: "อีเมลไม่ถูกต้อง" }, { status: 400 });
  const mail = emailEnabled() && customersEnabled();
  if (mail && !await limited(`forgot:${email}`, 3, 60 * 60_000)) {
    try {
      const c = await findCustomer(email);
      if (c) {
        const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
        const link = `${base}/auth/reset?t=${encodeURIComponent(signReset(c))}`;
        await sendEmail({
          to: email, subject: "ตั้งรหัสผ่านใหม่ · Mister Bamrungsuk",
          html: `<div style="font-family:'Noto Sans Thai',Tahoma,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e6c97a;border-radius:16px;color:#1a1206"><p style="margin:0;font-size:12px;color:#8f5e00">MISTER BAMRUNGSUK</p><h2 style="margin:6px 0 12px">ตั้งรหัสผ่านใหม่</h2><p style="font-size:14px">กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ ลิงก์ใช้ได้ 30 นาที และใช้ได้ครั้งเดียว</p><p><a href="${link}" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#e8c472;color:#1b130b;font-weight:600;text-decoration:none">ตั้งรหัสผ่านใหม่</a></p><p style="font-size:12px;color:#6b6152">ถ้าคุณไม่ได้ขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้</p></div>`,
        });
      }
    } catch (e) { console.error("forgot failed", e); }
  }
  return NextResponse.json({ ok: true, mail });
}
