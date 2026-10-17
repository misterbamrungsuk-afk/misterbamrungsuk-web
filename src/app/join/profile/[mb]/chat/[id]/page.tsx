import { notFound } from "next/navigation";
import { Forbidden } from "../../../../_kyc/ui";
import { PtHead, PtNav, PtPage, loadPt, ptHref } from "../../_pt";
import { PtChat } from "../../_ptc3";
import { QUICK_DEFAULT } from "@/lib/join/pt-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "แชทกับลูกค้า — Mister Bamrungsuk" };

// แชทของ Part-Time กับลูกค้าในการจองหนึ่งนัด (สิทธิ์ตรวจซ้ำที่ API)
export default async function PtChatPage({ params, searchParams }: { params: Promise<{ mb: string; id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  return (
    <PtPage>
      <PtHead back={ptHref(c, "jobs")} title="แชทกับลูกค้า" />
      <PtChat mb={c.mb} t={c.t} id={id} quick={c.x.pt_settings?.quick_replies?.length ? c.x.pt_settings.quick_replies : QUICK_DEFAULT} />
      <PtNav c={c} active="jobs" />
    </PtPage>
  );
}
