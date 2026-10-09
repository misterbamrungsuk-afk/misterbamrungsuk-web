import { extraOf, listApplicants } from "@/lib/join/store";
import { KycQueue } from "./queue";

export const dynamic = "force-dynamic";
export const metadata = { title: "คิว KYC · แอดมิน Mister Bamrungsuk" };

// คิวตรวจเอกสารยืนยันตัวตนของผู้สมัครที่ชำระแล้ว (kyc_status = submitted)
export default async function KycPage() {
  const rows = (await listApplicants()).map((r) => ({ ...r, ...extraOf(r) })).filter((r) => r.kyc_status && r.kyc_status !== "none");
  return <KycQueue initial={rows} />;
}
