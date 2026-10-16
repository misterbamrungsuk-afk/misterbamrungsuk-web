import { NextResponse } from "next/server";
import { clientIp, currentCustomer, rateLimited } from "@/lib/customer/auth";
import { verifySlip } from "@/lib/slip2go";
import { WalletError, createTopup, creditTopup, saveSlip, transRefUsed } from "@/lib/wallet";

export const runtime = "nodejs";

const MIN = 100, MAX = 100_000;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

// เติมเงินเข้ากระเป๋า: โอนผ่าน QR แล้วแนบสลิป → Slip2Go ยอดตรง + ยืนยันบัญชีร้าน + สลิปไม่เก่า = เข้ากระเป๋าทันที
// เทียบบัญชี/วันที่ไม่ได้ หรือตรวจไม่ได้ = รอแอดมิน · สลิปซ้ำ (Slip2Go หรือเลขอ้างอิงซ้ำในระบบเรา) / โอนผิดบัญชี = ไม่รับ
export async function POST(req: Request) {
  const me = await currentCustomer();
  if (!me) return bad("กรุณาเข้าสู่ระบบ", 401);
  if (rateLimited(`topup:${me.sub}`, 10, 60 * 60_000) || rateLimited(`topup-ip:${clientIp(req)}`, 20, 60 * 60_000)) return bad("ส่งบ่อยเกินไป กรุณารอสักครู่", 429);
  let form: FormData;
  try { form = await req.formData(); } catch { return bad("ข้อมูลไม่ถูกต้อง"); }
  const amount = Math.round(Number(form.get("amount")));
  if (!Number.isFinite(amount) || amount < MIN || amount > MAX) return bad(`เติมได้ ฿${MIN.toLocaleString()} – ฿${MAX.toLocaleString()} ต่อครั้ง`);
  const f = form.get("slip");
  if (!(f instanceof File) || f.size === 0) return bad("กรุณาแนบสลิป");
  if (!TYPES.includes(f.type) || f.size > 5 * 1024 * 1024) return bad("สลิปต้องเป็นรูป JPG/PNG/WEBP ไม่เกิน 5MB");

  const check = await verifySlip(f, amount);
  if (check?.verdict === "dup" || (await transRefUsed(check?.trans_ref))) return bad("สลิปนี้เคยถูกใช้แล้ว กรุณาแนบสลิปของการโอนครั้งนี้");
  if (check?.verdict === "acct") return bad("สลิปนี้โอนเข้าบัญชีที่ไม่ใช่ของ Mister Bamrungsuk กรุณาโอนผ่าน QR ในหน้านี้");
  try {
    const slip_path = await saveSlip(me.sub, f);
    const t = await createTopup({ customer_id: me.sub, customer_email: me.email, amount_satang: amount * 100, slip_path, slip_check: check });
    if (check?.verdict === "ok") {
      await creditTopup(t, "slip2go");
      return NextResponse.json({ ok: true, status: "credited" });
    }
    return NextResponse.json({ ok: true, status: "pending" });
  } catch (e) {
    if (e instanceof WalletError) return bad(e.message === "สลิปนี้เคยถูกใช้แล้ว" ? "สลิปนี้เคยถูกใช้แล้ว กรุณาแนบสลิปของการโอนครั้งนี้" : e.message);
    console.error("topup failed", e);
    return bad("ระบบขัดข้อง กรุณาลองใหม่", 500);
  }
}
