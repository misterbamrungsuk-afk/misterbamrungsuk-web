import { CLOSE_AT, COHORTS, QUOTA } from "@/lib/join/config";
import { countActive } from "@/lib/join/store";
import { getEarnings } from "@/lib/join/earnings-settings";
import { JoinSalePage, type Seats } from "./join-sale";

export const revalidate = 60;

export const metadata = { title: "รับสมัคร Part-Time — Mister Bamrungsuk" };

// ที่นั่งคงเหลือนับจากผู้สมัครที่ยัง active
export default async function JoinPage() {
  const [active, cfg] = await Promise.all([countActive().catch(() => 0), getEarnings()]);
  const left = Math.max(0, QUOTA - active);
  let acc = 0;
  const cohort = COHORTS.find((c) => (acc += c.capacity) > active)?.name ?? COHORTS[COHORTS.length - 1].name;
  const seats: Seats = { left, quota: QUOTA, cohort, closed: left === 0 || Date.now() > Date.parse(CLOSE_AT) };
  return <JoinSalePage seats={seats} showEarnings={cfg.show} />;
}
