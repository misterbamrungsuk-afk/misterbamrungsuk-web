import { listAppeals } from "@/lib/appeals";
import { PageHead } from "../admin-nav";
import { AppealsClient } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "อุทธรณ์ใบเตือน — แอดมิน" };

// Part-Time ยื่นอุทธรณ์ใบเตือนจากหน้าสถานะบัญชี — รับ = ยกเลิกใบเตือน (ไม่นับ) · ไม่รับ = ต้องใส่เหตุผล (แจ้ง Part-Time)
export default async function AppealsPage() {
  const list = await listAppeals().catch(() => []);
  return (
    <>
      <PageHead title="อุทธรณ์ใบเตือน" sub="ตรวจเหตุผลและหลักฐาน · รับอุทธรณ์ = ใบเตือนใบนั้นไม่นับ · ตัดสินได้ครั้งเดียว" />
      <AppealsClient list={list} />
    </>
  );
}
