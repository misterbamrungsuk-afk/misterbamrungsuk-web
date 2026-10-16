import { notFound } from "next/navigation";
import { Forbidden } from "../../../../_kyc/ui";
import { PtHead, PtNav, PtPage, loadPt, ptHref } from "../../_pt";
import { PtChat } from "../../_ptc3";

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
      <PtChat mb={c.mb} t={c.t} id={id} />
      <PtNav c={c} active="jobs" />
    </PtPage>
  );
}
