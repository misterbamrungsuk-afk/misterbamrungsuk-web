import { extraOf, listApplicants } from "@/lib/join/store";
import { PageHead } from "../admin-nav";
import { SlipQueue } from "./queue";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตรวจสลิป · แอดมิน Mister Bamrungsuk" };

// คิวตรวจสลิปผู้สมัคร Part-Time — ผลอัตโนมัติจาก Slip2Go + ปุ่มยืนยัน/ปฏิเสธของแอดมิน
export default async function SlipsPage() {
  const rows = (await listApplicants()).filter((r) => r.docs.slip).map((r) => ({ ...r, ...extraOf(r) }));
  const live = Boolean(process.env.SLIP2GO_API_SECRET);
  return (
    <>
      <PageHead
        title="ตรวจสลิป · Slip2Go"
        sub="สลิปค่าสมัครจากหน้า /join · ระบบตรวจยอด บัญชีผู้รับ และสลิปซ้ำให้อัตโนมัติ แอดมินกดยืนยันรับเงิน"
        right={<span className={`chip h-9 px-3.5 inline-flex items-center gap-2 ${live ? "border-emerald-500/60 text-emerald-300" : "text-ink-300"}`}><span className={`w-2 h-2 rounded-full ${live ? "bg-emerald-400" : "bg-ink-400"}`} />{live ? "เชื่อมต่อ Slip2Go แล้ว · ตรวจอัตโนมัติ" : "ยังไม่ได้ตั้ง SLIP2GO_API_SECRET"}</span>}
      />
      <SlipQueue initial={rows} />
    </>
  );
}
