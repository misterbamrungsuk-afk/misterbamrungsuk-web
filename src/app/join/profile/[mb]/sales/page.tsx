import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, loadPt, ptHref } from "../_pt";
import { repForParttime, repSummary } from "@/lib/member";
import { getMemberSettings } from "@/lib/member/tiers";
import { SalesBoard } from "@/components/sales-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "ชวนเปิดเมม · ค่าคอม — Mister Bamrungsuk" };

// Part-Time = Sale Man: โค้ด/ลิงก์ของตัวเอง · คนที่ชวนเปิดเมม · ค่าคอม (ถอนได้ หรือแปลงเป็นวงเงินโปรโมท ×2)
export default async function PtSalesPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const [rep, cfg] = await Promise.all([repForParttime(c.row), getMemberSettings()]);
  const sum = await repSummary(rep);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "misterbamrungsuk.com"}`;
  return (
    <PtPage>
      <PtHead back={ptHref(c)} title="ชวนเปิดเมม · ค่าคอม" />
      <main className="flex flex-col gap-3.5 max-w-[640px]" style={{ padding: "16px 16px 24px", lineHeight: 1.6 }}>
        <SalesBoard who="parttime" mb={c.mb} t={c.t} summary={sum} link={`${origin}/ref/${rep.code}`} tiers={{ gold: cfg.tiers.gold, black: cfg.tiers.black }} boostMult={cfg.boostMult} />
      </main>
      <PtNav c={c} active="earnings" />
    </PtPage>
  );
}
