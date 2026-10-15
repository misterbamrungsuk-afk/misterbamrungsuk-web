import { notFound } from "next/navigation";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, acctOf, baht, loadPt, ptHref } from "../_pt";
import { WithdrawForm } from "../_ptc";

export const dynamic = "force-dynamic";
export const metadata = { title: "ถอนเงิน — Mister Bamrungsuk" };

// บอร์ด Withdraw — ยอดถอนได้ · จำนวนเงิน · โอนเข้าบัญชี (จากใบสมัคร) · สรุปค่าธรรมเนียม · ประวัติการถอน
export default async function WithdrawPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const acct = acctOf(c.row);
  const box = "flex-1 rounded-xl";

  return (
    <PtPage>
      <PtHead back={ptHref(c, "earnings")} title="ถอนเงิน" />
      <div className="px-4 flex flex-col gap-3 max-w-[560px]">
        <div className="rounded-[22px]" style={{ padding: 18, background: "radial-gradient(120% 80% at 0% 0%, rgba(232,196,114,0.16) 0%, rgba(33,26,24,0) 60%), linear-gradient(180deg, #2a2120 0%, #1c1615 100%)", boxShadow: "0 14px 32px rgba(0,0,0,0.5)" }}>
          <div className="text-[13px] text-[#b5a596] font-light">ยอดถอนได้</div>
          <div className="font-bold text-[36px] leading-[1.25] text-[#e8c472] tabular-nums">{baht(0)}</div>
          <div className="flex gap-2 mt-2.5">
            <div className={box} style={{ padding: "8px 12px", background: "rgba(243,234,217,0.07)" }}><div className="text-[12px] text-[#b5a596] font-light">รอถอน</div><div className="text-[15px] font-semibold tabular-nums">{baht(0)}</div></div>
            <div className={box} style={{ padding: "8px 12px", background: "rgba(243,234,217,0.07)" }}><div className="text-[12px] text-[#b5a596] font-light">ถอนแล้วเดือนนี้</div><div className="text-[15px] font-semibold tabular-nums">{baht(0)}</div></div>
          </div>
        </div>
        <WithdrawForm avail={0} acct={acct} bankHref={`/join/bank/${c.mb}${c.q}`} />
        <div>
          <div className="font-medium text-[16px]" style={{ margin: "4px 0 2px" }}>ประวัติการถอน</div>
          <div className="text-[14px] font-light text-[#b5a596]" style={{ padding: "11px 0" }}>ยังไม่มีรายการ</div>
        </div>
      </div>
      <PtNav c={c} active="earnings" />
    </PtPage>
  );
}
