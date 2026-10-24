import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, loadPt, ptHref } from "../_pt";
import { repForParttime, repSummary } from "@/lib/member";
import { getMemberSettings } from "@/lib/member/tiers";
import { SalesBoard } from "@/components/sales-board";
import { GATE_MSG, GATE_SHORT, isPtActive } from "@/lib/join/pt-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "ชวนเปิดเมม · ค่าคอม — Mister Bamrungsuk" };

// Part-Time = Recruit: โค้ด/ลิงก์ของตัวเอง · คนที่ชวนเปิดเมม · ค่าคอม (ถอนได้ หรือแปลงเป็นวงเงินโปรโมท ×2)
export default async function PtSalesPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  // ยังไม่อนุมัติ/ยังไม่เปิดโปรไฟล์ → ยังไม่ออกโค้ดชวนเปิดเมม (API ตอบ 409 เหมือนกัน)
  if (!isPtActive(c.x)) return (
    <PtPage>
      <PtHead back={ptHref(c)} title="ชวนเปิดเมม · ค่าคอม" />
      <main className="px-4 max-w-[560px]"><div className="rounded-[18px] bg-[#211a18] flex flex-col gap-1" style={{ padding: 16 }}><b className="font-semibold text-[#e8c472]">{GATE_SHORT}</b><span className="text-[14px] font-light text-[#d9c9b4]">{GATE_MSG} · หลังจากนั้นจะได้โค้ด/ลิงก์ของตัวเองสำหรับชวนลูกค้าเปิดเมม</span></div></main>
      <PtNav c={c} active="earnings" />
    </PtPage>
  );
  const [rep, cfg] = await Promise.all([repForParttime(c.row), getMemberSettings()]);
  const sum = await repSummary(rep);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "misterbamrungsuk.com"}`;
  return (
    <PtPage>
      <PtHead back={ptHref(c)} title="ชวนเปิดเมม · ค่าคอม" />
      <main className="flex flex-col gap-3.5 max-w-[640px]" style={{ padding: "16px 16px 24px", lineHeight: 1.6 }}>
        <SalesBoard who="parttime" mb={c.mb} t={c.t} summary={sum} link={`${origin}/ref/${rep.code}`} tiers={{ gold: cfg.tiers.gold, black: cfg.tiers.black }} boostMult={cfg.boostMult} recruit={{ link: `${origin}/join/s/${rep.code}`, code: rep.code }} />
      </main>
      <PtNav c={c} active="earnings" />
    </PtPage>
  );
}
