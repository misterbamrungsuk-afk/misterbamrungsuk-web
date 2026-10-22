import { notFound } from "next/navigation";
import { getByMb } from "@/lib/join/store";
import { canResume } from "@/lib/join/resume";
import { Forbidden } from "../../_kyc/ui";
import { ContractForm } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "สัญญาและข้อตกลง — Mister Bamrungsuk" };

// บอร์ด P-Contract: อ่านสัญญา + ติ๊ก 3 ข้อ → ยอมรับและส่งใบสมัคร → /join/done
export default async function ContractPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const { mb } = await params;
  const { t } = await searchParams;
  if (!/^MB[MT]?-\d{7,}$/.test(mb) || !(await canResume(mb, t))) return <Forbidden />;
  const row = await getByMb(mb);
  if (!row) notFound();
  return <ContractForm mb={mb} t={t ?? ""} accepted={!!row.contract_accepted_at} />;
}
