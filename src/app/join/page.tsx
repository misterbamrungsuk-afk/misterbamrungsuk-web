import { CLOSE_AT } from "@/lib/join/config";
import { nextCohortSeats } from "@/lib/join/cohorts";
import { getEarnings } from "@/lib/join/earnings-settings";
import { JoinSalePage, type Seats } from "./join-sale";

export const revalidate = 60;

export const metadata = { title: "รับสมัคร Part-Time — Mister Bamrungsuk" };

// ที่นั่งคงเหลือ = นับจริงจากกลุ่มอบรมที่แอดมินเปิดรับ (/admin/cohorts) กับผู้สมัครที่ยัง active
export default async function JoinPage() {
  const [s, cfg] = await Promise.all([nextCohortSeats().catch(() => ({ cohort: "", left: 0, quota: 0, taken: 0, full: true })), getEarnings()]);
  const seats: Seats = { left: s.left, quota: s.quota, taken: s.taken, cohort: s.cohort, closed: s.full || Date.now() > Date.parse(CLOSE_AT) };
  return <JoinSalePage seats={seats} showEarnings={cfg.show} />;
}
