import { notFound } from "next/navigation";
import { canResume } from "@/lib/join/resume";
import { extraOf, getByMb } from "@/lib/join/store";
import { BANK } from "@/lib/join/config";
import { Forbidden, Page, StepHeader } from "../../_kyc/ui";
import { SlipForm } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "ส่งสลิปใหม่ — Mister Bamrungsuk" };

// ส่งสลิปใหม่ (แอดมินตีกลับสลิป) — QR ยอดเดิม + แนบสลิป → กลับไปหน้ารายการต้องแก้
export default async function SlipPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const { mb } = await params;
  const { t } = await searchParams;
  if (!/^MB[MT]?-\d{7,}$/.test(mb) || !(await canResume(mb, t))) return <Forbidden />;
  const row = await getByMb(mb);
  if (!row) notFound();
  const x = extraOf(row);
  const reason = x.kyc_status === "rejected" ? x.kyc_reason?.slip ?? "" : "";
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  return (
    <Page>
      <StepHeader title="ส่งสลิปใหม่" eyebrow={row.mb_code} back={`/join/rejected/${mb}${q}`} />
      <SlipForm mb={mb} t={t ?? ""} amount={row.amount} reason={reason} promptPayId={BANK.promptPayId} accountName={BANK.accountName}
        allowed={row.status === "pending_slip" || !!reason} />
    </Page>
  );
}
