import { QUOTA } from "@/lib/join/config";
import { isDemo, listApplicants, type ApplicantStatus } from "@/lib/join/store";
import { sheetsEnabled } from "@/lib/join/sheets";
import { PageHead, Card } from "../admin-nav";
import { ApplicantList } from "./list";

export const dynamic = "force-dynamic";
export const metadata = { title: "ผู้สมัคร · แอดมิน Mister Bamrungsuk" };

// ผู้สมัครหมอนวด/เพื่อนเที่ยวจากหน้า /join — ตรวจสลิป ยืนยัน คืนเงิน ส่งออก
export default async function ApplicantsPage() {
  const rows = await listApplicants();
  const count = (s: ApplicantStatus) => rows.filter((r) => r.status === s).length;
  const active = count("pending_slip") + count("verified");
  const verifiedSum = rows.filter((r) => r.status === "verified").reduce((s, r) => s + r.amount, 0);
  return (
    <>
      <PageHead title="ผู้สมัคร" sub="จากหน้ารับสมัคร /join · ตรวจสลิปและยืนยันการชำระเงิน" />
      {(isDemo || !sheetsEnabled()) && (
        <p className="mb-4 rounded-2xl border border-gold-500/40 px-4 py-3 text-xs text-ink-300">
          {isDemo ? "โหมดเดโม: ยังไม่ได้ตั้ง SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ข้อมูลหายเมื่อรีสตาร์ท · " : ""}
          {!sheetsEnabled() ? "ยังไม่ได้ตั้งค่า Google Sheet (GOOGLE_SHEETS_WEBHOOK_URL / GOOGLE_SHEETS_WEBHOOK_TOKEN)" : ""}
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["ที่นั่งใช้ไป", `${active}/${QUOTA}`],
          ["รอตรวจสลิป", String(count("pending_slip"))],
          ["ยืนยันแล้ว", String(count("verified"))],
          ["ยอดยืนยันแล้ว", `฿${verifiedSum.toLocaleString("th-TH")}`],
        ].map(([k, v]) => (
          <Card key={k}><p className="text-xs text-ink-300">{k}</p><p className="font-display text-2xl font-semibold mt-1 truncate">{v}</p></Card>
        ))}
      </div>
      <ApplicantList initial={rows} />
    </>
  );
}
