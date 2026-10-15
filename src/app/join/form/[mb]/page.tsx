import { notFound } from "next/navigation";
import { canResume } from "@/lib/join/resume";
import { extraOf, getByMb } from "@/lib/join/store";
import { Forbidden } from "../../_kyc/ui";
import { JoinFormClient } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "ใบสมัคร — Mister Bamrungsuk" };

// ใบสมัคร 1/4–2/4 หลังชำระเงิน (canvas: โปรไฟล์ของฉัน → JoinForm → JoinForm2 → D2) · ?step=2 เปิดขั้นวันเวลา
export default async function JoinFormPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string; step?: string; fix?: string }> }) {
  const { mb } = await params;
  const { t, step, fix } = await searchParams;
  if (!/^MB-\d{7,}$/.test(mb) || !(await canResume(mb, t))) return <Forbidden />;
  const row = await getByMb(mb);
  if (!row) notFound();
  const x = extraOf(row);
  const a = x.availability;
  return (
    <JoinFormClient mb={mb} t={t ?? ""} pkg={row.package} step={step === "2" ? 2 : 1} fix={fix === "1"}
      init={{
        first_name: row.first_name, last_name: row.last_name, nickname: row.nickname, birthdate: row.birthdate ?? "", tel: row.tel,
        line_id: row.line_id, address: row.address, areas: x.areas ?? [], no_area: x.no_area ?? "",
        week_days: a?.week_days ?? [], periods: a?.slots ?? [], hours_band: a?.hours_band ?? "", experience: row.experience, intro: row.intro,
        ack_hours: !!x.ack_hours, ack_no_refuse: !!x.ack_no_refuse,
        hasPhoto: !!row.docs.photo, hasBody: !!row.docs.other_doc, hasCert: !!row.docs.cert_doc,
      }} />
  );
}
