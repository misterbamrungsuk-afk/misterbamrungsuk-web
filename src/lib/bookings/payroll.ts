import "server-only";
import { allBalances } from "@/lib/wallet";
import { listApplicants } from "@/lib/join/store";
import { listAll } from "./index";
import { ptAmount } from "./day";

// สรุปรายได้ Part-Time รายวัน (หน้าแอดมิน /admin/payroll) — งานที่จบวันนี้ · ยอดรออนุมัติเข้ากระเป๋า · ยอดในกระเป๋า
export type PayJob = { id: string; code: string; starts_at: string; completed_at: string | null; hours: number; customer: string; price: number; tip: number; pct: number | null; pt: number; matured: boolean };
export type PayRow = {
  parttime_id: string; mb: string; name: string; nick: string;
  todayJobs: number; todayGross: number; todayPt: number; todayUpcoming: number;
  waitingJobs: number; waiting: number; pending: number; available: number; withdrawing: number;
  jobs: PayJob[]; sample?: boolean;
};

const bkkDay = (iso: string) => new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 10);
export const todayBkk = () => bkkDay(new Date().toISOString());

export async function payrollRows(day: string): Promise<{ rows: PayRow[]; sample: boolean }> {
  const [bookings, apps, bal] = await Promise.all([listAll(5000), listApplicants("verified").catch(() => []), allBalances().catch(() => [])]);
  const ids = new Set<string>([...bookings.map((b) => b.parttime_id), ...bal.filter((r) => r.owner_type === "parttime").map((r) => r.owner_id)]);
  const rows: PayRow[] = [];
  for (const id of ids) {
    const a = apps.find((x) => x.id === id);
    const mine = bookings.filter((b) => b.parttime_id === id);
    const money = bal.filter((r) => r.owner_type === "parttime" && r.owner_id === id);
    const sum = (k: string) => money.filter((r) => r.bucket === k).reduce((t, r) => t + r.balance, 0);
    const done = mine.filter((b) => b.status === "completed");
    const today = done.filter((b) => b.completed_at && bkkDay(b.completed_at) === day);
    const waiting = done.filter((b) => !b.matured_at);
    const show = [...new Map([...today, ...waiting].map((b) => [b.id, b])).values()].sort((x, y) => Date.parse(y.completed_at ?? y.starts_at) - Date.parse(x.completed_at ?? x.starts_at));
    const jobs: PayJob[] = await Promise.all(show.map(async (b) => ({
      id: b.id, code: b.code, starts_at: b.starts_at, completed_at: b.completed_at, hours: b.hours + (b.extra_hours ?? 0), customer: b.customer_name || (b.customer_email ?? "").split("@")[0] || "ลูกค้า",
      price: b.price_satang, tip: b.tip_satang ?? 0, pct: b.share_pct ?? null, pt: await ptAmount(b), matured: !!b.matured_at,
    })));
    const ptOf = (list: typeof done) => list.reduce((t, b) => t + (jobs.find((j) => j.id === b.id)?.pt ?? 0), 0);
    const mb = a?.mb_code ?? mine[0]?.parttime_mb ?? "";
    if (!mine.length && !money.some((r) => r.balance !== 0)) continue;
    rows.push({
      parttime_id: id, mb, name: a ? `${a.first_name} ${a.last_name}`.trim() : "", nick: a?.nickname || mine[0]?.parttime_nick || mb,
      todayJobs: today.length, todayGross: today.reduce((t, b) => t + b.price_satang, 0), todayPt: ptOf(today),
      todayUpcoming: mine.filter((b) => ["accepted", "checked_in"].includes(b.status) && bkkDay(b.starts_at) === day).length,
      waitingJobs: waiting.length, waiting: ptOf(waiting), pending: sum("pending"), available: sum("available"), withdrawing: sum("withdrawing"), jobs,
    });
  }
  rows.sort((x, y) => y.waiting - x.waiting || y.todayPt - x.todayPt);
  if (rows.length) return { rows, sample: false };
  // ยังไม่มีงานจริง → ตัวอย่าง 1 คน (ตามที่สั่ง: ส่วนที่ต้องใช้ข้อมูลจริง แสดง mockup ไปก่อน) · ปุ่มอนุมัติใช้ไม่ได้
  const at = (h: number) => new Date(Date.parse(`${day}T00:00:00+07:00`) + h * 3600_000).toISOString();
  const jobs: PayJob[] = [
    { id: "s1", code: "BK-7Q2M4X", starts_at: at(12), completed_at: at(15.2), hours: 3, customer: "คุณ เอ.", price: 350000, tip: 50000, pct: 40, pt: 190000, matured: false },
    { id: "s2", code: "BK-K8D1RZ", starts_at: at(18), completed_at: at(23.1), hours: 5, customer: "คุณ บี.", price: 525000, tip: 0, pct: 40, pt: 210000, matured: false },
    { id: "s3", code: "BK-3NV6PA", starts_at: at(-6), completed_at: at(-3), hours: 3, customer: "คุณ ซี.", price: 350000, tip: 20000, pct: 40, pt: 160000, matured: true },
  ];
  return { sample: true, rows: [{
    parttime_id: "sample", mb: "MBM-2610001", name: "ธนกร ใจดี", nick: "ต้น", sample: true,
    todayJobs: 2, todayGross: 875000, todayPt: 400000, todayUpcoming: 1, waitingJobs: 2, waiting: 400000,
    pending: 400000, available: 160000, withdrawing: 0, jobs,
  }] };
}
