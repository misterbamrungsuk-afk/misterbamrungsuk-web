import { payrollRows, todayBkk } from "@/lib/bookings/payroll";
import { getMoney } from "@/lib/wallet/settings";
import { PageHead } from "../admin-nav";
import { PayrollClient } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "รายได้ Part-Time — แอดมิน" };

// ตรวจงานรายวันของแต่ละคน → สรุปยอดรวมเป็นรายการ → อนุมัติรายได้เข้ากระเป๋า (Part-Time ถอนหรือใช้ซื้อของต่อได้)
export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(d ?? "") ? d! : todayBkk();
  const [{ rows, sample }, money] = await Promise.all([payrollRows(day), getMoney()]);
  return (
    <>
      <PageHead title="รายได้ Part-Time" sub={`ตรวจงานวันที่ ${new Date(`${day}T12:00:00+07:00`).toLocaleDateString("th-TH", { dateStyle: "long" })} · ${money.releaseMode === "auto" ? `ตอนนี้ปล่อยเงินอัตโนมัติหลัง ${money.releaseHours} ชม. (เปลี่ยนเป็นแอดมินอนุมัติได้ที่ "กระเป๋าเงิน")` : "รายได้เข้ากระเป๋าเมื่อแอดมินกดอนุมัติ"}`} />
      <PayrollClient day={day} today={todayBkk()} rows={rows} sample={sample} />
    </>
  );
}
