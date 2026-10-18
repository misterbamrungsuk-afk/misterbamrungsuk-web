import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { balances, history, listTopups } from "@/lib/wallet";
import { customerWithdrawInfo } from "@/lib/payouts/customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// กระเป๋าเงินของลูกค้าที่ล็อกอินอยู่: ยอด (ใช้ได้ / กันไว้ระหว่างรอตอบรับ / กำลังถอน) + ประวัติ + คำขอเติมเงิน + ถอนได้เท่าไร/คำขอถอน
export async function GET() {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  let b: Record<string, number>, h: Awaited<ReturnType<typeof history>>, t: Awaited<ReturnType<typeof listTopups>>;
  try { [b, h, t] = await Promise.all([balances("customer", me.sub), history("customer", me.sub, 50), listTopups({ customer: me.sub, limit: 20 })]); }
  catch (e) { console.error("wallet load", e); return NextResponse.json({ ok: false, error: "ระบบกระเป๋าเงินยังไม่เปิดใช้งาน" }, { status: 503 }); }
  // ส่วนถอนเงินพลาด (เช่น ยังไม่รัน migration) ไม่ให้หน้ากระเป๋าเงินล่มทั้งหน้า
  const wd = await customerWithdrawInfo(me.sub).catch((e) => { console.error("wallet withdraw info", e); return null; });
  return NextResponse.json({
    ok: true, available: b.available ?? 0, held: b.held ?? 0, withdrawing: b.withdrawing ?? 0, history: h,
    topups: t.map(({ id, amount_satang, status, reason, created_at }) => ({ id, amount_satang, status, reason, created_at })),
    withdraw: wd,
  });
}
