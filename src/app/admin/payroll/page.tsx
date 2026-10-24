import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { payrollRows, todayBkk } from "@/lib/bookings/payroll";
import { listWithdrawals } from "@/lib/bookings/day";
import { getMoney } from "@/lib/wallet/settings";
import { PageHead } from "../admin-nav";
import { PayrollClient, type WReq } from "./client";
import { listPayouts, listReps } from "@/lib/member/store";
import { listPayoutRequests } from "@/lib/payouts";
import { withdrawInfo } from "@/lib/admin/withdraw-info";

export const dynamic = "force-dynamic";
export const metadata = { title: "CEO · อนุมัติ — แอดมิน" };

// หน้า CEO (อนุมัติได้คนเดียว): ชั้นที่ 1 ตรวจงานรายวัน → อนุมัติรายได้เข้ากระเป๋า · ชั้นที่ 2 อนุมัติคำขอถอนเงินเข้าบัญชีธนาคาร
// อนุมัติถอนแล้ว → ส่งต่อหน้าแอดมิน "โอนให้ Part-Time" ให้โอนและกดเช็กว่าโอนสำเร็จ
export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(d ?? "") ? d! : todayBkk();
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  const [{ rows, sample }, money, allW, sp, reps] = await Promise.all([payrollRows(day), getMoney(), listWithdrawals().catch(() => []), listPayouts({ status: "requested" }).catch(() => []), listReps().catch(() => [])]);
  // บัญชีที่ไม่เคยโอนสำเร็จมาก่อน = ติดป้าย "บัญชีใหม่" ให้ CEO ตรวจชื่อบัญชีกับชื่อร้าน/พาร์ทเนอร์ก่อนอนุมัติ (กันคนได้คุกกี้ไปแล้วเปลี่ยนบัญชีรับเงิน)
  const allReqs = await listPayoutRequests().catch(() => []);
  const paidAcc = new Set(allReqs.filter((w) => w.status === "paid").map((w) => `${w.owner_type}:${w.owner_id}:${w.bank.account.replace(/\D/g, "")}`));
  const ownerReqs = allReqs.filter((w) => w.status === "requested").map((w) => ({ id: w.id, type: w.owner_type, name: w.owner_name, amount: Number(w.amount_satang), bank: `${w.bank.bank} · ${w.bank.account} · ${w.bank.name}`, at: w.created_at, newBank: !paidAcc.has(`${w.owner_type}:${w.owner_id}:${w.bank.account.replace(/\D/g, "")}`) }));
  // ชื่อ PT + ป้าย "บัญชีใหม่" เมื่อบัญชีปลายทางต่างจากบัญชีที่โอนสำเร็จครั้งล่าสุด
  const wds = allW.filter((w) => w.status === "requested");
  const info = await withdrawInfo(wds, allW);
  const reqs: WReq[] = wds.map((w) => ({ id: w.id, mb: w.parttime_mb, name: info[w.id]?.name ?? "", newBank: !!info[w.id]?.newBank, firstTime: !!info[w.id]?.firstTime, nick: rows.find((r) => r.parttime_id === w.parttime_id)?.nick ?? (info[w.id]?.nick || w.parttime_mb), amount: w.amount_satang, fee: w.fee_satang, wht: w.wht_satang, net: w.net_satang, bank: `${w.bank.bank} · ${w.bank.account} · ${w.bank.name}`, at: w.created_at }));
  const salesReqs = sp.map((p) => { const r = reps.find((x) => x.id === p.rep_id); return { id: p.id, name: r?.name ?? "Recruit", code: r?.code ?? "", amount: p.amount_satang, bank: p.bank ? `${p.bank.bank} · ${p.bank.account} · ${p.bank.name}` : "-", at: p.created_at }; });
  return (
    <>
      <PageHead title="CEO · อนุมัติรายได้และถอนเงิน" sub={`ตรวจงานวันที่ ${new Date(`${day}T12:00:00+07:00`).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "long" })} · ${money.releaseMode === "auto" ? `ตอนนี้ปล่อยรายได้อัตโนมัติหลัง ${money.releaseHours} ชม. (เปลี่ยนได้ที่ "กระเป๋าเงิน")` : "รายได้เข้ากระเป๋าเมื่อ CEO อนุมัติ"} · ${s?.role === "ceo" ? "คุณคือ CEO" : "ดูอย่างเดียว — อนุมัติได้เฉพาะ CEO"}`} />
      <PayrollClient day={day} today={todayBkk()} rows={rows} sample={sample} reqs={reqs} salesReqs={salesReqs} ownerReqs={ownerReqs} isCeo={s?.role === "ceo"} />
    </>
  );
}
