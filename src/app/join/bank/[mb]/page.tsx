import { notFound } from "next/navigation";
import { fullName, getByMb } from "@/lib/join/store";
import { canResume } from "@/lib/join/resume";
import { Forbidden, Page, StepHeader } from "../../_kyc/ui";
import { BankForm } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "บัญชีรับเงิน — Mister Bamrungsuk" };

export default async function BankPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const { mb } = await params;
  const { t } = await searchParams;
  if (!/^MB-\d{7,}$/.test(mb)) notFound();
  if (!(await canResume(mb, t))) return <Forbidden />;
  const row = await getByMb(mb);
  if (!row) notFound();
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  return (
    <Page>
      <StepHeader step={5} title="บัญชีรับเงิน" back={`/join/kyc/${mb}${q}`} />
      <BankForm mb={mb} t={t ?? ""} initial={{ bank: row.bank, account: row.bank_account, name: row.bank_account_name || fullName(row) }} />
    </Page>
  );
}
