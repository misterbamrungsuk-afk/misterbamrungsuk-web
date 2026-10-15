import Link from "next/link";
import { notFound } from "next/navigation";
import { getEarnings, tierLabel } from "@/lib/join/earnings-settings";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, baht, loadPt, ptHref } from "../_pt";
import { EarnSim } from "../_ptc";

export const dynamic = "force-dynamic";
export const metadata = { title: "รายได้ของฉัน — Mister Bamrungsuk" };

// บอร์ด MyEarnings — ระดับจากแอดมิน · นัดเดือนนี้ · ขั้นส่วนแบ่ง · ตัวจำลอง · ยอดถอนได้
export default async function MyEarningsPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const cfg = await getEarnings();
  const top = c.x.tier === "top";
  const svc = c.row.package === "B" ? cfg.price3h.massage : cfg.price3h.eat;
  const price = top ? svc.top : svc.silver;
  const cases = 0;
  const cur = Math.max(0, cfg.tiers.findLastIndex((t) => cases >= t.min));
  const nextT = cfg.tiers[cur + 1];

  return (
    <PtPage>
      <PtHead back={ptHref(c)} title="รายได้ของฉัน" />
      <div className="px-4 flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <div className="rounded-[18px] flex flex-col gap-3" style={{ padding: 16, background: "linear-gradient(150deg, #3a2a17 0%, #251d1b 70%)" }}>
            <div className="flex justify-between items-center gap-2">
              <span className="text-[13px] font-light text-[#d9c9b4]">ระดับของคุณ</span>
              <span className="rounded-full text-[12px] font-semibold" style={{ padding: "3px 10px", background: top ? "#e8c472" : "rgba(243,234,217,0.14)", color: top ? "#1b130b" : "#f3ead9" }}>{top ? "TOP" : "Silver"}</span>
            </div>
            <div className="flex justify-between items-end gap-3">
              <span className="flex flex-col"><span className="text-[13px] font-light text-[#d9c9b4]">รายได้เดือนนี้</span><span className="font-semibold text-[32px] leading-[1.15] tabular-nums">{baht(0)}</span></span>
              <span className="text-right flex flex-col"><span className="text-[13px] font-light text-[#d9c9b4]">นัดที่จบแล้ว</span><span className="font-semibold text-[22px] tabular-nums">{cases} นัด</span></span>
            </div>
            <span className="text-[13px] font-light text-[#d9c9b4]">{c.row.package === "B" ? "สายนวด" : "สายกินเที่ยว"} · ราคาต่อนัด 3 ชม. {baht(price)} · ระดับ TOP/Silver ทีมงานเป็นผู้กำหนด</span>
          </div>

          <div className="rounded-[18px] bg-[#211a18] flex flex-col gap-3" style={{ padding: 16 }}>
            <span className="text-[15px] font-semibold">ขั้นส่วนแบ่ง (นับนัดต่อเดือน)</span>
            <ol className="m-0 p-0 list-none flex flex-col gap-2">
              {cfg.tiers.map((t, i) => {
                const on = i === cur;
                return (
                  <li key={i} className="flex justify-between items-center rounded-xl" style={{ padding: "10px 12px", background: on ? "rgba(232,196,114,0.16)" : "#251d1b" }}>
                    <span className="text-[14px] font-light">{tierLabel(t)}{on && <span className="text-[#e8c472]"> · ตอนนี้</span>}</span>
                    <span className="font-semibold text-[#e8c472] tabular-nums">{t.pct}%</span>
                  </li>
                );
              })}
            </ol>
            {nextT && <span className="text-[13px] font-light text-[#d9c9b4]">อีก {nextT.min - cases} นัดในเดือนนี้ ขยับเป็น {nextT.pct}%</span>}
            <span className="text-[12px] font-light text-[#b5a596]">ทิปได้ {cfg.tipPct}% · {cfg.payout} หลังจบนัด · ลูกค้าไม่มาตามนัด: {cfg.noShow}</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <EarnSim price={price} tiers={cfg.tiers} />
          <div className="rounded-[18px] bg-[#211a18] flex justify-between items-center gap-3" style={{ padding: 16 }}>
            <span className="flex flex-col"><span className="text-[13px] font-light text-[#d9c9b4]">ยอดถอนได้</span><span className="font-semibold text-[24px] tabular-nums">{baht(0)}</span></span>
            <Link href={ptHref(c, "withdraw")} className="h-11 px-5 rounded-xl bg-[#e8c472] text-[#1b130b] text-[14px] font-semibold grid place-items-center hover:text-[#1b130b]">ถอนเงิน</Link>
          </div>
          <div className="rounded-[18px] bg-[#211a18] flex flex-col gap-1" style={{ padding: 16 }}>
            <span className="text-[15px] font-semibold">ประวัติรายได้</span>
            <span className="text-[14px] font-light text-[#d9c9b4]">ยังไม่มีรายการ · รายได้จะขึ้นที่นี่หลังจบนัดแรก</span>
          </div>
        </div>
      </div>
      <PtNav c={c} active="earnings" />
    </PtPage>
  );
}
