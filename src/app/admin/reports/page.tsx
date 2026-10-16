import Link from "next/link";
import { listReports } from "@/lib/reports";
import { PageHead } from "../admin-nav";
import { CloseReport } from "./close";

export const dynamic = "force-dynamic";
export const metadata = { title: "รายงานผู้ใช้ — แอดมิน" };

// รายงานผู้ใช้จากลูกค้า (บอร์ด C-Report) — ตรวจภายใน 24 ชม. · "ทำให้รู้สึกไม่ปลอดภัย" แจ้งเป็น SOS ด้วย
export default async function ReportsPage() {
  const rows = await listReports().catch(() => []);
  const open = rows.filter((r) => r.status === "open");
  return (
    <>
      <PageHead title="รายงานผู้ใช้" sub={`${open.length} เรื่องรอตรวจ · ผู้ถูกรายงานไม่เห็นว่าใครรายงาน`} />
      <div className="flex flex-col gap-2 max-w-[900px]">
        {!rows.length && <p className="rounded-2xl border border-ink-600 p-6 text-center text-ink-300">ยังไม่มีรายงาน</p>}
        {rows.map((r) => (
          <div key={r.id} className={`rounded-2xl border p-4 flex flex-col gap-1.5 text-[13.5px] ${r.status === "open" ? "border-crimson-500" : "border-ink-600 opacity-70"}`}>
            <div className="flex flex-wrap gap-2 items-center"><b>{r.code}</b><span className="rounded-full px-2.5 h-6 grid place-items-center text-[11px] font-semibold bg-crimson-500 text-white">{r.reason}</span>{r.blocked && <span className="text-ink-300 text-[12px]">· ลูกค้าบล็อกแล้ว</span>}<span className="ml-auto text-[11.5px] text-[#9a8a85]">{new Date(r.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</span></div>
            <div>ผู้ถูกรายงาน: {r.target_label ?? r.target_id}</div>
            <div className="text-ink-300">ผู้รายงาน: {r.reporter_type === "customer" ? "ลูกค้า" : "Part-Time"} {r.reporter_id}</div>
            {r.detail && <div className="whitespace-pre-wrap">{r.detail}</div>}
            <div className="flex gap-3 items-center pt-1">
              {r.booking_id && <Link href={`/admin/chats/${r.booking_id}`} className="text-[#f0c75a]">อ่านแชทของนัด ›</Link>}
              {r.status === "open" ? <CloseReport id={r.id} /> : <span className="text-ink-300 text-[12px]">ปิดแล้ว · {r.admin_note}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
