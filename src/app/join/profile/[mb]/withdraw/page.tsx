import Link from "next/link";
import { notFound } from "next/navigation";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, baht, loadPt, ptHref } from "../_pt";

export const dynamic = "force-dynamic";
export const metadata = { title: "ถอนเงิน — Mister Bamrungsuk" };

// บอร์ด Withdraw — ยอดใช้ได้ · บัญชีจากใบสมัคร (ปิดเลขกลาง) · ขั้นต่ำ ฿500 · ค่าธรรมเนียม 3% + หัก ณ ที่จ่าย 3%
const MIN = 500;
export default async function WithdrawPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const avail = 0;
  const acc = c.row.bank_account?.replace(/\D/g, "") ?? "";
  const masked = acc ? `xxx-x-x${acc.slice(-4, -1)}-${acc.slice(-1)}` : "";

  return (
    <PtPage>
      <PtHead back={ptHref(c, "earnings")} title="ถอนเงิน" />
      <div className="px-4 flex flex-col gap-4 max-w-[560px]">
        <div className="rounded-[18px] flex flex-col gap-1" style={{ padding: 16, background: "linear-gradient(150deg, #3a2a17 0%, #251d1b 70%)" }}>
          <span className="text-[13px] font-light text-[#d9c9b4]">ยอดที่ถอนได้</span>
          <span className="font-semibold text-[34px] leading-[1.15] tabular-nums">{baht(avail)}</span>
          <span className="text-[13px] font-light text-[#d9c9b4]">ถอนขั้นต่ำ {baht(MIN)} · โอนเข้าบัญชีภายใน 1 วันทำการ</span>
        </div>

        <div className="rounded-[18px] bg-[#211a18] flex flex-col gap-2" style={{ padding: 16 }}>
          <div className="flex justify-between items-center"><span className="font-semibold">บัญชีรับเงิน</span><Link href={`/join/bank/${c.mb}${c.q}`} className="text-[13px] text-[#e8c472] font-light">{acc ? "เปลี่ยน ›" : "+ เพิ่มบัญชี"}</Link></div>
          {acc
            ? <div className="rounded-xl bg-[#251d1b] flex flex-col" style={{ padding: "10px 12px" }}><span className="text-[14px]">{c.row.bank} · <span className="tabular-nums">{masked}</span></span><span className="text-[12.5px] font-light text-[#d9c9b4]">{c.row.bank_account_name}</span></div>
            : <span className="text-[14px] font-light text-[#d9c9b4]">ยังไม่ได้เพิ่มบัญชีรับเงิน</span>}
        </div>

        <div className="rounded-[18px] bg-[#211a18] flex flex-col gap-3" style={{ padding: 16 }}>
          <label className="flex flex-col gap-1.5"><span className="text-[13px] font-light text-[#d9c9b4]">จำนวนที่ต้องการถอน</span>
            <input disabled inputMode="numeric" placeholder={`ขั้นต่ำ ${baht(MIN)}`} className="h-12 rounded-xl bg-[#251d1b] px-3.5 text-[15px] opacity-60" /></label>
          <div className="flex flex-col gap-1 text-[13px] font-light text-[#d9c9b4]">
            <div className="flex justify-between"><span>ค่าธรรมเนียม 3%</span><span className="tabular-nums">{baht(0)}</span></div>
            <div className="flex justify-between"><span>หักภาษี ณ ที่จ่าย 3%</span><span className="tabular-nums">{baht(0)}</span></div>
            <div className="flex justify-between text-[#f3ead9] font-semibold text-[14px]"><span>ได้รับจริง</span><span className="tabular-nums">{baht(0)}</span></div>
          </div>
          <button type="button" disabled className="h-12 rounded-[14px] text-[15px] font-semibold text-[#b5a596]" style={{ background: "rgba(243,234,217,0.08)" }}>ยอดยังไม่ถึงขั้นต่ำ {baht(MIN)}</button>
        </div>

        <div className="rounded-[18px] bg-[#211a18] flex flex-col gap-1" style={{ padding: 16 }}>
          <span className="font-semibold">ประวัติการถอน</span>
          <span className="text-[14px] font-light text-[#d9c9b4]">ยังไม่มีรายการ</span>
        </div>
      </div>
      <PtNav c={c} active="earnings" />
    </PtPage>
  );
}
