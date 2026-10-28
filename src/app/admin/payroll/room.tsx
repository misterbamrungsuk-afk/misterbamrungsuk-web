import { todayBkk } from "@/lib/bookings/payroll";
import type { loadCeoRoom } from "@/lib/admin/ceo-room";
import { PageHead } from "../admin-nav";
import { PayrollClient } from "./client";
import { CeoSummary } from "./ceo-summary";

/** หน้าห้อง CEO — ใช้ร่วมกันระหว่าง /admin/payroll (CEO กดได้) กับ /admin/ceo-view (แอดมินดูอย่างเดียว) */
export function CeoRoom({ x, day, isCeo, base }: { x: Awaited<ReturnType<typeof loadCeoRoom>>; day: string; isCeo: boolean; base: string }) {
  const date = new Date(`${day}T12:00:00+07:00`).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "long" });
  const mode = x.money.releaseMode === "auto" ? `ตอนนี้ปล่อยรายได้อัตโนมัติหลัง ${x.money.releaseHours} ชม. (เปลี่ยนได้ที่ "กระเป๋าเงิน")` : "เงินเข้ากระเป๋าเมื่อ CEO อนุมัติ";
  return (
    <>
      <PageHead title={isCeo ? "ห้อง CEO" : "ห้อง CEO · ดูอย่างเดียว"} sub={`${isCeo ? "อนุมัติได้คนเดียว" : "อนุมัติได้เฉพาะ CEO"} · ตรวจงานวันที่ ${date} · ${mode}`} />
      {!isCeo && <p data-ceo-readonly className="m-0 mb-4 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold" style={{ background: "#f6ecd2", color: "#8a6516" }}>ดูอย่างเดียว · ทุกรายการรอ CEO อนุมัติ · หลัง CEO อนุมัติถอน แอดมินโอนได้ที่หน้า &quot;โอนเงินออก&quot;</p>}
      <CeoSummary income={x.income} totals={x.totals} people={x.people} />
      <PayrollClient day={day} today={todayBkk()} rows={x.rows} sample={x.sample} reqs={x.reqs} salesReqs={x.salesReqs} ownerReqs={x.ownerReqs} bonusReqs={x.bonusReqs} stays={x.stayReqs} lastMonth={x.lastMonth} isCeo={isCeo} base={base} />
    </>
  );
}
