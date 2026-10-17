import { notFound } from "next/navigation";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, acctOf, baht, loadPt, ptHref } from "../_pt";
import { WithdrawForm } from "../_ptc";
import { listWithdrawals, ptWallet } from "@/lib/bookings/day";
import { getMoney } from "@/lib/wallet/settings";
import { extraOf } from "@/lib/join/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "ถอนเงิน — Mister Bamrungsuk" };

// บอร์ด Withdraw — ยอดถอนได้ · จำนวนเงิน · โอนเข้าบัญชี (จากใบสมัคร) · สรุปค่าธรรมเนียม · ประวัติการถอน
export default async function WithdrawPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const acct = acctOf(c.row);
  const box = "flex-1 rounded-xl";
  // ยอดจริงจาก ledger (ยังไม่รัน migration = แสดง 0)
  const [w, ws, m] = await Promise.all([ptWallet(c.row.id).catch(() => ({ available: 0, withdrawing: 0, pending: 0 })), listWithdrawals({ parttime_id: c.row.id }).catch(() => []), getMoney()]);
  const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
  const paidMonth = ws.filter((x) => x.status === "paid" && x.paid_at && Date.parse(x.paid_at) >= +month).reduce((t, x) => t + x.net_satang, 0);
  const ST: Record<string, [string, string]> = { requested: ["รอ CEO อนุมัติ", "#e8c472"], approved: ["อนุมัติแล้ว · รอโอน", "#e8c472"], batched: ["กำลังโอน", "#e8c472"], paid: ["โอนแล้ว", "#7fd6a3"], failed: ["โอนไม่สำเร็จ · คืนยอดแล้ว", "#ff8a9a"] };

  return (
    <PtPage>
      <PtHead back={ptHref(c, "earnings")} title="ถอนเงิน" />
      <div className="px-4 flex flex-col gap-3 max-w-[560px]">
        <div className="rounded-[22px]" style={{ padding: 18, background: "radial-gradient(120% 80% at 0% 0%, rgba(232,196,114,0.16) 0%, rgba(33,26,24,0) 60%), linear-gradient(180deg, #2a2120 0%, #1c1615 100%)", boxShadow: "0 14px 32px rgba(0,0,0,0.5)" }}>
          <div className="text-[13px] text-[#b5a596] font-light">ยอดถอนได้</div>
          <div className="font-bold text-[36px] leading-[1.25] text-[#e8c472] tabular-nums">{baht(w.available / 100)}</div>
          <div className="flex gap-2 mt-2.5">
            <div className={box} style={{ padding: "8px 12px", background: "rgba(243,234,217,0.07)" }}><div className="text-[12px] text-[#b5a596] font-light">กำลังโอน</div><div className="text-[15px] font-semibold tabular-nums">{baht(w.withdrawing / 100)}</div></div>
            <div className={box} style={{ padding: "8px 12px", background: "rgba(243,234,217,0.07)" }}><div className="text-[12px] text-[#b5a596] font-light">ถอนแล้วเดือนนี้</div><div className="text-[15px] font-semibold tabular-nums">{baht(paidMonth / 100)}</div></div>
          </div>
        </div>
        <WithdrawForm avail={Math.floor(w.available / 100)} acct={acct} bankHref={`/join/bank/${c.mb}${c.q}`} mb={c.mb} t={c.t} rules={{ min: m.minWithdraw, feePct: m.feePct, whtPct: m.whtPct }} kycOk={extraOf(c.row).kyc_status === "approved"} />
        <div>
          <div className="font-medium text-[16px]" style={{ margin: "4px 0 2px" }}>ประวัติการถอน</div>
          {!ws.length ? <div className="text-[14px] font-light text-[#b5a596]" style={{ padding: "11px 0" }}>ยังไม่มีรายการ</div> : ws.map((x) => (
            <div key={x.id} className="flex justify-between items-center gap-3 text-[14px]" style={{ padding: "11px 0", borderBottom: "1px solid rgba(243,234,217,0.07)" }}>
              <span className="flex flex-col"><span>{baht(x.amount_satang / 100)} → รับ {baht(x.net_satang / 100)}</span><span className="text-[12px] font-light text-[#b5a596]">{new Date(x.created_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</span></span>
              <span className="text-[12.5px] font-semibold" style={{ color: ST[x.status][1] }}>{ST[x.status][0]}</span>
            </div>
          ))}
        </div>
      </div>
      <PtNav c={c} active="earnings" />
    </PtPage>
  );
}
