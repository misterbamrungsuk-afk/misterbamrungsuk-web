import "server-only";
import { payrollRows } from "@/lib/bookings/payroll";
import { listWithdrawals } from "@/lib/bookings/day";
import { getMoney } from "@/lib/wallet/settings";
import { allBalances } from "@/lib/wallet";
import { listPayouts, listReps } from "@/lib/member/store";
import { listPayoutRequests } from "@/lib/payouts";
import { withdrawInfo } from "@/lib/admin/withdraw-info";
import { listMonthlyBonuses, prevMonthTH } from "@/lib/member/recruit-bonus";
import { listIncome, type IncomeRow } from "@/lib/admin/income";
import { listApplicants } from "@/lib/join/store";
import { listPartners } from "@/lib/partner/store";
import { listVendors } from "@/lib/market/store";
import { listStaysAwaitingCeo } from "@/lib/hotels/store";

export type PersonType = "parttime" | "sales" | "partner" | "vendor";
/** แถวรายคน (สตางค์): รอ CEO เข้ากระเป๋า · ในกระเป๋า · ขอถอน (รอ CEO) · อนุมัติแล้วรอโอน · ถอนสำเร็จรวม */
export type PersonRow = { key: string; type: PersonType; name: string; sub: string; waiting: number; available: number; requested: number; approved: number; paid: number };
export type StayReq = { id: string; code: string; hotel: string; room: string; check_out: string; nights: number; total: number; net: number; pct: number };

// ห้อง CEO (28 ต.ค. 2569): ข้อมูลชุดเดียวใช้ทั้ง /admin/payroll (CEO กดอนุมัติ) และ /admin/ceo-view (แอดมินดูอย่างเดียว)
export async function loadCeoRoom(day: string) {
  const safe = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);
  const [{ rows, sample }, money, allW, salesAll, reps, allReqs, bonuses, income, bal, apps, partners, vendors, stays] = await Promise.all([
    payrollRows(day), getMoney(), safe(listWithdrawals()), safe(listPayouts()), safe(listReps()), safe(listPayoutRequests()), safe(listMonthlyBonuses()),
    safe(listIncome()), safe(allBalances()), safe(listApplicants()), safe(listPartners()), safe(listVendors()), safe(listStaysAwaitingCeo()),
  ]);

  // ── คิวอนุมัติ (เหมือนหน้าเดิม) ──
  // บัญชีที่ไม่เคยโอนสำเร็จมาก่อน = ติดป้าย "บัญชีใหม่" ให้ CEO ตรวจชื่อบัญชีก่อนอนุมัติ
  const paidAcc = new Set(allReqs.filter((w) => w.status === "paid").map((w) => `${w.owner_type}:${w.owner_id}:${w.bank.account.replace(/\D/g, "")}`));
  const ownerReqs = allReqs.filter((w) => w.status === "requested").map((w) => ({ id: w.id, type: w.owner_type, name: w.owner_name, amount: Number(w.amount_satang), bank: `${w.bank.bank} · ${w.bank.account} · ${w.bank.name}`, at: w.created_at, newBank: !paidAcc.has(`${w.owner_type}:${w.owner_id}:${w.bank.account.replace(/\D/g, "")}`) }));
  const wds = allW.filter((w) => w.status === "requested");
  const info = await withdrawInfo(wds, allW);
  const reqs = wds.map((w) => ({ id: w.id, mb: w.parttime_mb, name: info[w.id]?.name ?? "", newBank: !!info[w.id]?.newBank, firstTime: !!info[w.id]?.firstTime, nick: rows.find((r) => r.parttime_id === w.parttime_id)?.nick ?? (info[w.id]?.nick || w.parttime_mb), amount: w.amount_satang, fee: w.fee_satang, wht: w.wht_satang, net: w.net_satang, bank: `${w.bank.bank} · ${w.bank.account} · ${w.bank.name}`, at: w.created_at }));
  const salesReqs = salesAll.filter((p) => p.status === "requested").map((p) => { const r = reps.find((x) => x.id === p.rep_id); return { id: p.id, name: r?.name ?? "Recruit", code: r?.code ?? "", amount: p.amount_satang, bank: p.bank ? `${p.bank.bank} · ${p.bank.account} · ${p.bank.name}` : "-", at: p.created_at }; });
  const bonusPending = bonuses.filter((b) => b.status === "pending");
  const bonusReqs = bonusPending.map((b) => ({ id: b.id, rep: reps.find((r) => r.id === b.rep_id)?.name ?? "Recruit", code: reps.find((r) => r.id === b.rep_id)?.code ?? "", pt: `${b.nick} (${b.mb})`, month: b.month, jobs: b.jobs, amount: b.amount_satang }));
  const stayReqs: StayReq[] = stays.map((b) => ({ id: b.id, code: b.code, hotel: b.partner_name, room: b.room_name, check_out: b.check_out, nights: b.nights, total: b.total_satang, net: b.net_satang, pct: b.platform_pct }));

  // ── รายคน ──
  const people = new Map<string, PersonRow>();
  const person = (type: PersonType, id: string, name: string, sub = "") => {
    const k = `${type}:${id}`;
    let r = people.get(k);
    if (!r) { r = { key: k, type, name, sub, waiting: 0, available: 0, requested: 0, approved: 0, paid: 0 }; people.set(k, r); }
    return r;
  };
  const appName = new Map(apps.map((a) => [a.id, { name: `${a.nickname || a.first_name}`, sub: `${a.mb_code} · ${a.first_name} ${a.last_name}` }]));
  const repName = new Map(reps.map((r) => [r.id, { name: r.name || "Recruit", sub: `Recruit ${r.code}` }]));
  const partnerName = new Map(partners.map((p) => [p.id, { name: p.business_name, sub: p.type }]));
  const vendorName = new Map(vendors.map((v) => [v.id, { name: v.name, sub: "ร้านค้า" }]));
  const nameOf = (type: PersonType, id: string) => (type === "parttime" ? appName : type === "sales" ? repName : type === "partner" ? partnerName : vendorName).get(id) ?? { name: id.slice(0, 12), sub: "" };
  const P = (type: PersonType, id: string) => { const n = nameOf(type, id); return person(type, id, n.name, n.sub); };

  for (const b of bal) {
    if (b.bucket !== "available" || !["parttime", "sales", "partner", "vendor"].includes(b.owner_type)) continue;
    if (!b.balance) continue;
    P(b.owner_type as PersonType, b.owner_id).available += b.balance;
  }
  if (!sample) for (const r of rows) if (r.waiting) P("parttime", r.parttime_id).waiting += r.waiting;
  for (const b of bonusPending) P("sales", b.rep_id).waiting += b.amount_satang;
  for (const s of stays) P("partner", s.partner_id).waiting += s.net_satang;
  for (const w of allW) {
    const r = P("parttime", w.parttime_id);
    if (w.status === "requested") r.requested += w.amount_satang;
    else if (w.status === "approved" || w.status === "batched") r.approved += w.amount_satang;
    else if (w.status === "paid") r.paid += w.amount_satang;
  }
  for (const p of salesAll) {
    const r = P("sales", p.rep_id);
    if (p.status === "requested") r.requested += p.amount_satang;
    else if (p.status === "approved") r.approved += p.amount_satang;
    else if (p.status === "paid") r.paid += p.amount_satang;
  }
  for (const w of allReqs) {
    if (w.owner_type !== "partner" && w.owner_type !== "vendor") continue;
    const r = P(w.owner_type, w.owner_id);
    const a = Number(w.amount_satang);
    if (w.status === "requested") r.requested += a;
    else if (w.status === "approved") r.approved += a;
    else if (w.status === "paid") r.paid += a;
  }
  const list = [...people.values()].filter((r) => r.waiting || r.available || r.requested || r.approved || r.paid)
    .sort((a, b) => b.waiting + b.requested - (a.waiting + a.requested) || b.available - a.available);

  // ลูกค้าถอน (ไม่อยู่ในตารางรายคน แต่นับในยอดรอ CEO)
  const custReq = allReqs.filter((w) => w.owner_type === "customer");
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const totals = {
    waiting: sum(list.map((r) => r.waiting)),
    waitingN: list.filter((r) => r.waiting).length,
    requested: sum(list.map((r) => r.requested)) + sum(custReq.filter((w) => w.status === "requested").map((w) => Number(w.amount_satang))),
    requestedN: reqs.length + salesReqs.length + ownerReqs.length,
    approved: sum(list.map((r) => r.approved)) + sum(custReq.filter((w) => w.status === "approved").map((w) => Number(w.amount_satang))),
    available: sum(list.map((r) => r.available)),
  };
  const incomeRows: Pick<IncomeRow, "at" | "system" | "status" | "amount">[] = income.map((r) => ({ at: r.at, system: r.system, status: r.status, amount: r.amount }));

  return {
    money, rows, sample, reqs, salesReqs, ownerReqs, bonusReqs, stayReqs, lastMonth: prevMonthTH(),
    people: list, totals, income: incomeRows,
  };
}
