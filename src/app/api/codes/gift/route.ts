import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { limited } from "@/lib/rate-limit";
import { hasContact } from "@/lib/join/contact-guard";
import { CodeError, buyGift, myGifts } from "@/lib/codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pub = (g: Awaited<ReturnType<typeof myGifts>>[number]) => ({ code: g.code, amount_satang: g.amount_satang, used: g.used >= g.max_uses, expires_at: g.expires_at, to_name: g.to_name, message: g.message, created_at: g.created_at });

// บัตรของขวัญ: GET = บัตรที่ฉันซื้อ · POST { amount (บาท), to_name, to_contact, message } = ซื้อจากกระเป๋า → ได้โค้ดส่งให้เพื่อน
export async function GET() {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, gifts: (await myGifts(me.sub).catch(() => [])).map(pub) });
}
export async function POST(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (await limited(`gift:${me.sub}`, 10, 60 * 60_000)) return NextResponse.json({ ok: false, error: "ซื้อบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { amount?: number; to_name?: string; to_contact?: string; message?: string };
  if (hasContact(String(b.message ?? ""))) return NextResponse.json({ ok: false, error: "ข้อความถึงผู้รับห้ามมีเบอร์โทร LINE หรือลิงก์" }, { status: 400 });
  try {
    const g = await buyGift(me.sub, Math.round(Number(b.amount) * 100), { name: String(b.to_name ?? ""), contact: String(b.to_contact ?? ""), message: String(b.message ?? "") });
    return NextResponse.json({ ok: true, gift: pub(g) });
  } catch (e) {
    if (e instanceof CodeError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("gift buy", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง กรุณาลองใหม่" }, { status: 500 });
  }
}
