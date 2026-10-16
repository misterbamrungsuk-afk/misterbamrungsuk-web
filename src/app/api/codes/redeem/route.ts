import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { limited } from "@/lib/rate-limit";
import { CodeError, redeem } from "@/lib/codes";

export const runtime = "nodejs";

// ใช้โค้ดของขวัญ/โปรโมชัน (บอร์ด C-Redeem) → เครดิตเข้ากระเป๋า · กันเดาโค้ด 10 ครั้ง/15 นาที
export async function POST(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (await limited(`redeem:${me.sub}`, 10, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ลองหลายครั้งเกินไป กรุณารอ 15 นาที" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { code?: string };
  try {
    return NextResponse.json({ ok: true, ...(await redeem(String(b.code ?? ""), me.sub)) });
  } catch (e) {
    if (e instanceof CodeError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("redeem", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง กรุณาลองใหม่" }, { status: 500 });
  }
}
