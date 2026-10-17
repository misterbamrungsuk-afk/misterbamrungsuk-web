import { extraOf, getAttendance, listApplicants } from "@/lib/join/store";
import { cohortTaken, listCohorts } from "@/lib/join/cohorts";
import { CohortsClient, type Member } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "กลุ่มอบรม · แอดมิน Mister Bamrungsuk" };

// กลุ่มอบรม Part-Time — สร้างกลุ่ม ดูที่นั่ง เช็กชื่อรายรอบ
export default async function CohortsPage() {
  const [cohorts, apps, seats] = await Promise.all([listCohorts(), listApplicants("verified"), cohortTaken().catch(() => null)]);
  const members: Member[] = await Promise.all(
    apps
      .map((a) => ({ a, cohort: extraOf(a).cohort ?? null }))
      .filter((x): x is { a: (typeof apps)[number]; cohort: string } => !!x.cohort)
      .map(async ({ a, cohort }) => ({
        id: a.id,
        cohort,
        name: `${a.first_name}${a.last_name ? ` ${a.last_name.slice(0, 1)}.` : ""}${a.nickname ? ` (${a.nickname})` : ""}`,
        code: a.mb_code,
        att: await getAttendance(a.id),
      })),
  );
  // ที่นั่งที่ใช้ = ตัวเลขเดียวกับหน้า /join (รวมคนรอตรวจสลิป + ยังไม่จัดกลุ่ม)
  return <CohortsClient initialCohorts={cohorts} initialMembers={members} taken={Object.fromEntries(seats?.taken ?? [])} />;
}
