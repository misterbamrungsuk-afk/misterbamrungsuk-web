import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { extraOf, isDemo, listApplicants } from "@/lib/join/store";
import { listCohorts } from "@/lib/join/cohorts";
import { sheetsEnabled } from "@/lib/join/sheets";
import { ApplicantList } from "./list";

export const dynamic = "force-dynamic";
export const metadata = { title: "ผู้สมัคร · แอดมิน Mister Bamrungsuk" };

// ผู้สมัคร Part-Time จากหน้า /join — ตามบอร์ด AdminApplicants (?pkg=A|B เลือกแท็บสายงานไว้ก่อน)
export default async function ApplicantsPage({ searchParams }: { searchParams: Promise<{ pkg?: string }> }) {
  const { pkg } = await searchParams;
  // บทบาทส่งให้หน้าจอซ่อนปุ่มที่ API จะปฏิเสธ (เช่น การเงินตัดสิน KYC ไม่ได้)
  const role = (await verifySession((await cookies()).get(ADMIN_COOKIE)?.value))?.role ?? "finance";
  const rows = (await listApplicants()).map((r) => ({ ...r, ...extraOf(r) }));
  const cohorts = (await listCohorts()).map((c) => ({ key: c.key, name: c.name }));
  const note = isDemo || !sheetsEnabled()
    ? `${isDemo ? "โหมดเดโม: ยังไม่ได้ตั้ง SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ข้อมูลหายเมื่อรีสตาร์ท · " : ""}${!sheetsEnabled() ? "ยังไม่ได้ตั้งค่า Google Sheet (GOOGLE_SHEETS_WEBHOOK_URL / GOOGLE_SHEETS_WEBHOOK_TOKEN)" : ""}`
    : "";
  return <ApplicantList initial={rows} cohorts={cohorts} initialPkg={pkg === "A" || pkg === "B" ? pkg : "all"} note={note} role={role} />;
}
