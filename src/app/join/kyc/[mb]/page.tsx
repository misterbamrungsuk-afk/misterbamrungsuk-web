import { notFound } from "next/navigation";
import { getByMb } from "@/lib/join/store";
import { canResume } from "@/lib/join/resume";
import { Forbidden, Page, StepHeader } from "../../_kyc/ui";
import { KycForm } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "ยืนยันตัวตน — Mister Bamrungsuk" };

export default async function KycPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const { mb } = await params;
  const { t } = await searchParams;
  if (!/^MB-\d{7,}$/.test(mb)) notFound();
  if (!(await canResume(mb, t))) return <Forbidden />;
  const row = await getByMb(mb);
  if (!row) notFound();
  return (
    <Page>
      <StepHeader step={4} title="ยืนยันตัวตน" back="/join/pay" />
      <KycForm mb={mb} t={t ?? ""} hasIdCard={!!row.docs.id_card} />
    </Page>
  );
}
