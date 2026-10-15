import Link from "next/link";
import { notFound } from "next/navigation";
import { getEarnings } from "@/lib/join/earnings-settings";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, acctOf, baht, loadPt, ptHref } from "../_pt";
import { EarnBoard } from "../_ptc";

export const dynamic = "force-dynamic";
export const metadata = { title: "รายได้ของฉัน — Mister Bamrungsuk" };

// บอร์ด MyEarnings — ภารกิจเดือนนี้ · ส่วนแบ่ง · ประมาณการ · ยอดถอนได้ · ใบเสร็จ/ใบหัก ณ ที่จ่าย · ประวัติ
// ราคาและขั้นส่วนแบ่งมาจากแอดมิน (ราคาและส่วนแบ่ง) · ระดับ TOP/Silver แอดมินตั้งรายคน
export default async function MyEarningsPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const cfg = await getEarnings();
  const top = c.x.tier === "top";
  const svc = c.row.package === "B" ? cfg.price3h.massage : cfg.price3h.eat;
  const acct = acctOf(c.row);
  const empty = (t: string) => <div className="text-[14px] font-light text-[#b5a596]" style={{ padding: "12px 0" }}>{t}</div>;

  return (
    <PtPage>
      <PtHead back={ptHref(c)} title="รายได้ของฉัน" />
      <div className="px-4 flex flex-col gap-3.5 md:grid md:grid-cols-2 md:items-start">
        <div className="flex flex-col gap-3.5 min-w-0">
          <EarnBoard price={top ? svc.top : svc.silver} tiers={cfg.tiers} top={top} />
        </div>
        <div className="flex flex-col gap-3.5 min-w-0">
          <div className="rounded-[22px]" style={{ padding: 18, background: "linear-gradient(180deg, #2a2120 0%, #1f1817 100%)" }}>
            <div className="text-[13px] font-light">ยอดถอนได้</div>
            <div className="font-bold text-[36px] text-[#e8c472] tabular-nums">{baht(0)}</div>
            <div className="flex gap-[18px] text-[13px] font-light mt-1"><span>รอปล่อยเงิน {baht(0)}</span><span>ถอนแล้ว {baht(0)}</span></div>
            <Link href={ptHref(c, "withdraw")} className="w-full h-[50px] mt-3.5 rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold text-[16px] grid place-items-center hover:text-[#1b130b]">{acct ? `ถอนเข้า ${acct.name} ${acct.tail}` : "ถอนเงิน"}</Link>
          </div>
          <div className="rounded-[20px] bg-[#1b2322]" style={{ padding: 16 }}>
            <div className="flex justify-between items-baseline gap-2"><span className="font-medium text-[16px]">ใบเสร็จ/ใบกำกับภาษี &amp; ใบหัก ณ ที่จ่าย</span><Link href={ptHref(c, "docs")} className="text-[13px] text-[#e8c472] font-light shrink-0">ดูทั้งหมด ›</Link></div>
            <div className="text-[12.5px] font-light opacity-70 mt-0.5">ออกให้อัตโนมัติทุกครั้งที่ถอน · เก็บไฟล์ 30 วัน</div>
            {empty("ยังไม่มีเอกสาร · จะออกให้หลังถอนเงินครั้งแรก")}
          </div>
          <div>
            <div className="font-medium text-[16px] mb-1">ประวัติ</div>
            {empty("ยังไม่มีรายการ · รายได้จะขึ้นที่นี่หลังจบเคสแรก")}
          </div>
        </div>
      </div>
      <PtNav c={c} active="earnings" />
    </PtPage>
  );
}
