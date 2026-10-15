import { getCovers } from "@/lib/covers";
import { CLOSE_AT, COHORTS, QUOTA } from "@/lib/join/config";
import { countActive } from "@/lib/join/store";
import { JoinSalePage, type Seats } from "./join-sale";

export const revalidate = 60;

export const metadata = { title: "รับสมัคร Part-Time — Mister Bamrungsuk" };

// โปสเตอร์มาจากแอดมิน "รูปหน้าปก" (ช่อง join_poster) · ที่นั่งคงเหลือนับจากผู้สมัครที่ยัง active
export default async function JoinPage() {
  const [[poster], active] = await Promise.all([getCovers("join_poster"), countActive().catch(() => 0)]);
  const left = Math.max(0, QUOTA - active);
  let acc = 0;
  const cohort = COHORTS.find((c) => (acc += c.capacity) > active)?.name ?? COHORTS[COHORTS.length - 1].name;
  const seats: Seats = { left, quota: QUOTA, cohort, closed: left === 0 || Date.now() > Date.parse(CLOSE_AT) };
  return <JoinSalePage poster={poster ?? "/brand/poster.jpg"} seats={seats} />;
}
