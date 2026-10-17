import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { extraOf, listApplicants } from "@/lib/join/store";
import { KycQueue } from "./queue";
import { BankReview } from "./bank-review";

export const dynamic = "force-dynamic";
export const metadata = { title: "คิว KYC · แอดมิน Mister Bamrungsuk" };

// คิวตรวจเอกสารยืนยันตัวตนของผู้สมัครที่ชำระแล้ว (kyc_status = submitted)
export default async function KycPage() {
  const role = (await verifySession((await cookies()).get(ADMIN_COOKIE)?.value))?.role;
  // ออกลิงก์เข้าโปรไฟล์ได้เฉพาะบทบาทที่เข้า /admin/applicants ได้ (บทบาท KYC ไม่ได้ — แยกหน้าที่)
  const canLink = !!role && canAccess(role, "/admin/applicants");
  const all = (await listApplicants()).map((r) => ({ ...r, ...extraOf(r) }));
  const rows = all.filter((r) => r.kyc_status && r.kyc_status !== "none");
  const banks = all.filter((r) => r.bank_review).map((r) => ({ id: r.id, mb_code: r.mb_code, first_name: r.first_name, last_name: r.last_name, nickname: r.nickname, bank: r.bank, bank_account: r.bank_account, bank_account_name: r.bank_account_name, bank_book_path: r.bank_book_path ?? null, bank_review: r.bank_review! }));
  return <div className="flex flex-col gap-4"><BankReview rows={banks} /><KycQueue initial={rows} canLink={canLink} /></div>;
}
