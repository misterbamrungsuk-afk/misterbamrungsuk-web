import { notFound } from "next/navigation";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, loadPt, ptHref } from "../_pt";

export const dynamic = "force-dynamic";
export const metadata = { title: "รีวิวของฉัน — Mister Bamrungsuk" };

// บอร์ด P-Reviews — สรุปคะแนน (ยังไม่มีรีวิวจนกว่าจะจบนัดแรก)
export default async function ReviewsPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  return (
    <PtPage>
      <PtHead back={ptHref(c)} title="รีวิวของฉัน" />
      <div className="px-4 flex flex-col gap-4 max-w-[560px]">
        <div className="rounded-[18px] bg-[#211a18] flex items-center gap-4" style={{ padding: 16 }}>
          <span className="flex flex-col items-center"><span className="font-semibold text-[34px] text-[#e8c472] leading-none">—</span><span className="text-[13px] font-light text-[#b5a596] mt-1">0 รีวิว</span></span>
          <div className="flex-1 flex flex-col gap-1">
            {[5, 4, 3, 2, 1].map((s) => (
              <div key={s} className="flex items-center gap-2 text-[12px] font-light text-[#b5a596]"><span className="w-6">{s}★</span><span className="flex-1 h-1.5 rounded-full bg-[#251d1b]" /><span className="w-4 text-right tabular-nums">0</span></div>
            ))}
          </div>
        </div>
        <div className="rounded-[18px] bg-[#211a18] flex flex-col items-center text-center gap-1" style={{ padding: "28px 16px" }}>
          <span className="font-semibold">ยังไม่มีรีวิว</span>
          <span className="text-[14px] font-light text-[#d9c9b4]">ลูกค้าจะรีวิวได้หลังจบนัดแรก · รีวิวที่ดีช่วยให้ขึ้นระดับ TOP</span>
        </div>
      </div>
      <PtNav c={c} active="settings" />
    </PtPage>
  );
}
