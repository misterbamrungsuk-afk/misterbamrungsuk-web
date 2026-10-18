import "server-only";
import { balances, history } from "@/lib/wallet";
import { listPurchases } from "@/lib/member/store";
import { getCustomerRules } from "@/lib/bookings/rules";
import { PayoutError, listPayoutRequests, requestPayout, type PayoutRequest } from "./index";

// ลูกค้าถอนเงินในกระเป๋าเข้าบัญชีธนาคาร — ทางเดินเดียวกับพาร์ทเนอร์/ร้านค้า (CEO อนุมัติ → แอดมินโอน)
// กติกา: ถอนได้ = ยอดใช้ได้ − เครดิตที่ไม่ใช่เงินโอนเข้า (โบนัสเปิดเมม + เครดิตจากโค้ดโปรโมชัน/บัตรของขวัญ) ทั้งหมดที่เคยได้ · ไม่ต่ำกว่า 0
// (นับแบบเข้ม: โบนัสที่ใช้จองไปแล้วก็ยังหักอยู่ — กันเติมเงิน ใช้โบนัส แล้วถอนเงินสดออก)

/** ยอดเครดิตที่ถอนไม่ได้ (สตางค์) */
export async function nonWithdrawable(customer_id: string): Promise<number> {
  const [buys, hist] = await Promise.all([
    listPurchases({ customer_id, status: "credited" }).catch(() => []),
    history("customer", customer_id, 1000).catch(() => []),
  ]);
  const bonus = buys.reduce((t, p) => t + Math.max(0, Number(p.bonus_satang) || 0), 0);
  const promo = hist.filter((h) => h.kind === "promo" && h.bucket === "available" && h.amount > 0).reduce((t, h) => t + h.amount, 0);
  return bonus + promo;
}

/** สรุปสำหรับหน้า /wallet */
export async function customerWithdrawInfo(customer_id: string) {
  const [bal, locked, reqs, rules] = await Promise.all([
    balances("customer", customer_id).catch(() => ({} as Record<string, number>)),
    nonWithdrawable(customer_id),
    listPayoutRequests({ owner_type: "customer", owner_id: customer_id }).catch(() => [] as PayoutRequest[]),
    getCustomerRules(),
  ]);
  const available = bal.available ?? 0;
  return {
    withdrawing: bal.withdrawing ?? 0,
    withdrawable: Math.max(0, available - locked),
    locked,
    min: rules.custMinWithdraw * 100,
    requests: reqs.slice(0, 10).map(({ id, amount_satang, status, note, created_at, paid_at, bank }) => ({ id, amount_satang: Number(amount_satang), status, note, created_at, paid_at, bank: { bank: bank.bank, account: bank.account, name: bank.name } })),
    lastBank: reqs[0]?.bank ?? null,
  };
}

/** ลูกค้าขอถอน — บัญชีต้องมีเลข 10–15 หลัก + ชื่อบัญชี · ไม่เกินยอดถอนได้ */
export async function requestCustomerWithdraw(me: { sub: string; email: string; name?: string }, amountBaht: number, bankIn: unknown): Promise<PayoutRequest> {
  const x = (bankIn ?? {}) as Record<string, unknown>;
  const digits = String(x.account ?? "").replace(/\D/g, "");
  if (!String(x.bank ?? "").trim() || !String(x.name ?? "").trim() || digits.length < 10 || digits.length > 15) throw new PayoutError("กรอกธนาคาร เลขบัญชี 10–15 หลัก และชื่อบัญชีให้ครบ");
  const info = await customerWithdrawInfo(me.sub);
  if (info.requests.some((r) => r.status === "requested" || r.status === "approved")) throw new PayoutError("มีคำขอถอนที่รอดำเนินการอยู่แล้ว");
  return requestPayout("customer", me.sub, [me.name, me.email].filter(Boolean).join(" · ") || me.sub, amountBaht, { bank: x.bank, account: digits, name: x.name }, { min: info.min, max: info.withdrawable });
}
