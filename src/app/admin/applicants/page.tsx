import { QUOTA } from "@/lib/join/config";
import { extraOf, isDemo, listApplicants } from "@/lib/join/store";
import { sheetsEnabled } from "@/lib/join/sheets";
import { PageHead, Card } from "../admin-nav";
import { ApplicantList } from "./list";

export const dynamic = "force-dynamic";
export const metadata = { title: "ผู้สมัคร · แอดมิน Mister Bamrungsuk" };

// ผู้สมัคร Part-Time (เพื่อนกินเที่ยว) จากหน้า /join — ตรวจสลิป จัดรุ่นอบรม กลุ่ม LINE ส่งออก
export default async function ApplicantsPage() {
  // รวมคอลัมน์ 0003 กับ docs.extra ฝั่งเซิร์ฟเวอร์ (ทนได้ถ้ายังไม่รัน migration)
  const rows = (await listApplicants()).map((r) => ({ ...r, ...extraOf(r) }));
  const paid = rows.filter((r) => r.status === "verified");
  const active = rows.filter((r) => r.status === "pending_slip" || r.status === "verified").length;
  const sum = paid.reduce((s, r) => s + r.amount, 0);
  const waitLine = paid.filter((r) => !r.line_joined).length;
  const byPkg = (k: "A" | "B") => paid.filter((r) => r.package === k).length;
  return (
    <>
      <PageHead title="ผู้สมัคร Part-Time" sub="จากหน้ารับสมัคร /join · ตรวจสลิป จัดรุ่นอบรม และติดตามการเข้ากลุ่ม LINE" />
      {(isDemo || !sheetsEnabled()) && (
        <p className="mb-4 rounded-2xl border border-gold-500/40 px-4 py-3 text-xs text-ink-300">
          {isDemo ? "โหมดเดโม: ยังไม่ได้ตั้ง SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ข้อมูลหายเมื่อรีสตาร์ท · " : ""}
          {!sheetsEnabled() ? "ยังไม่ได้ตั้งค่า Google Sheet (GOOGLE_SHEETS_WEBHOOK_URL / GOOGLE_SHEETS_WEBHOOK_TOKEN)" : ""}
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <p className="text-xs text-ink-300">ผู้สมัครที่ชำระแล้ว</p>
          <p className="font-display text-2xl font-semibold mt-1">{paid.length}<span className="text-ink-300 text-base">/{QUOTA}</span></p>
          <p className="text-[11px] text-ink-400 mt-1">ใช้ที่นั่ง (รวมรอตรวจ) {active}</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-300">แยกแพ็กเกจ</p>
          <p className="font-display text-2xl font-semibold mt-1"><span className="text-gold-300">A</span> {byPkg("A")} · <span className="text-gold-300">B</span> {byPkg("B")}</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-300">รอเข้ากลุ่ม LINE</p>
          <p className="font-display text-2xl font-semibold mt-1 text-crimson-300">{waitLine}</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-300">ยอดรวม (ยืนยันแล้ว)</p>
          <p className="font-display text-2xl font-semibold mt-1 text-gold-300 truncate">฿{sum.toLocaleString("th-TH")}</p>
        </Card>
      </div>
      <ApplicantList initial={rows} />
    </>
  );
}
