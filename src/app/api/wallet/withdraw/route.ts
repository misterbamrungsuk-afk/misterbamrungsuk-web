import { NextResponse } from "next/server";
import { clientIp, currentCustomer } from "@/lib/customer/auth";
import { limited } from "@/lib/rate-limit";
import { PayoutError } from "@/lib/payouts";
import { requestCustomerWithdraw } from "@/lib/payouts/customer";

export const runtime = "nodejs";

// ลูกค้าขอถอนเงินในกระเป๋าเข้าบัญชีธนาคาร: { amount (บาท), bank: { bank, account, name } } → รอ CEO อนุมัติ → แอดมินโอน
export async function POST(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (await limited(`cwd:${me.sub}`, 10, 60 * 60_000) || await limited(`cwd-ip:${clientIp(req)}`, 20, 60 * 60_000)) return NextResponse.json({ ok: false, error: "ส่งบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { amount?: unknown; bank?: unknown };
  try {
    const r = await requestCustomerWithdraw(me, Number(b.amount), b.bank);
    return NextResponse.json({ ok: true, request: { id: r.id, status: r.status, amount_satang: Number(r.amount_satang) } });
  } catch (e) {
    if (e instanceof PayoutError) return NextResponse.json({ ok: false, error: e.message }, { status: 409 });
    console.error("customer withdraw", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง กรุณาลองใหม่" }, { status: 500 });
  }
}
