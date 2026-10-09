import { extraOf, listApplicants } from "@/lib/join/store";
import { SlipQueue } from "./queue";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตรวจสลิป · แอดมิน Mister Bamrungsuk" };

// คิวตรวจสลิปผู้สมัคร Part-Time — ผลอัตโนมัติจาก Slip2Go + ปุ่มยืนยัน/ปฏิเสธของแอดมิน (บอร์ด AdminSlips)
export default async function SlipsPage() {
  const rows = (await listApplicants()).filter((r) => r.docs.slip).map((r) => ({ ...r, ...extraOf(r) }));
  const live = Boolean(process.env.SLIP2GO_API_SECRET);
  return <SlipQueue initial={rows} live={live} />;
}
