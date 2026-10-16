import { limited } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { clientIp, forgetSession, readReset, setCustomerPassword } from "@/lib/customer/auth";

export const runtime = "nodejs";

// ตั้งรหัสผ่านใหม่จากลิงก์ในอีเมล (บอร์ด C-ResetPassword) — ลิงก์ใช้ได้ครั้งเดียว (ผูกกับ hash รหัสเดิม)
export async function POST(req: Request) {
  if (await limited(`reset:${clientIp(req)}`, 10, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ลองบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { t?: string; password?: string };
  const password = String(b.password ?? "");
  if (password.length < 8 || password.length > 200) return NextResponse.json({ ok: false, error: "รหัสผ่านอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
  const c = await readReset(String(b.t ?? "")).catch(() => null);
  if (!c) return NextResponse.json({ ok: false, error: "ลิงก์หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่" }, { status: 410 });
  try {
    await setCustomerPassword(c.id, password);
    forgetSession(c.id); // session เก่าทุกเครื่องใช้ไม่ได้ (ลายนิ้วมือรหัสเปลี่ยน)
    return NextResponse.json({ ok: true, email: c.email });
  } catch (e) {
    console.error("reset failed", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง กรุณาลองใหม่" }, { status: 500 });
  }
}
