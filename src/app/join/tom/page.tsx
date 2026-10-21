import { CLOSE_AT } from "@/lib/join/config";
import { nextCohortSeats } from "@/lib/join/cohorts";
import { getEarnings } from "@/lib/join/earnings-settings";
import { JoinSalePage, type Seats } from "../join-sale";

export const revalidate = 60;

export const metadata = { title: "รับสมัครสาวหล่อ · Part-Time — Mister Bamrungsuk", description: "สาวหล่อ (ทอม) เพื่อนกินเที่ยว Mister Bamrungsuk · งานพาร์ทไทม์ เลือกวันเวลาเอง" };

// หมวดสาวหล่อ (บอสสั่ง 21 ต.ค. 2569) — ค่าสมัครเท่าหนุ่มหล่อ · ที่นั่งอบรมแยกโควตา (นับเฉพาะสาวหล่อ)
export default async function JoinTomPage() {
  const [s, cfg] = await Promise.all([nextCohortSeats("tom").catch(() => ({ cohort: "", left: 0, quota: 0, full: true })), getEarnings()]);
  const seats: Seats = { left: s.left, quota: s.quota, cohort: s.cohort, closed: s.full || Date.now() > Date.parse(CLOSE_AT) };
  return <JoinSalePage seats={seats} showEarnings={cfg.show} group="tom" />;
}
