import { notFound } from "next/navigation";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, loadPt, ptHref } from "../_pt";
import { WorkForm } from "../_ptc2";

export const dynamic = "force-dynamic";
export const metadata = { title: "เวลาทำงาน — Mister Bamrungsuk" };

// บอร์ด P-Availability — ค่าเริ่มต้นจากใบสมัคร (วันที่สะดวก + ช่วงเวลา) ถ้ายังไม่เคยตั้ง
const DAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
export default async function AvailabilityPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const w = c.x.work;
  const av = c.x.availability;
  const night = !av?.slots?.includes("กลางวัน") || av.slots.includes("กลางคืน");
  const [from, to] = av?.slots?.includes("กลางวัน") && !av.slots.includes("กลางคืน") ? ["10:00", "17:00"] : night ? ["17:00", "23:00"] : ["10:00", "23:00"];
  const days = w?.days ?? Object.fromEntries(DAYS.map((d) => [d, { on: (av?.week_days ?? []).includes(d), from, to }]));
  return (
    <PtPage>
      <PtHead back={ptHref(c, "schedule")} title="เวลาทำงาน" />
      <div className="px-4 max-w-[560px]">
        <WorkForm mb={c.mb} t={c.t} init={{ days, radius_km: w?.radius_km ?? 8, paused: w?.paused ?? false }} />
      </div>
      <PtNav c={c} active="schedule" />
    </PtPage>
  );
}
