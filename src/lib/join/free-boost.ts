import "server-only";
import { FREE_BOOST, issueBoostCode, listBoostCodes } from "./boost";
import { extraOf, listApplicants, saveProfile } from "./store";

// รอบรายวัน (cron · sweeps.ts): Part-Time ที่เปิดรับงานครบ 30 วัน และได้งานจบไม่ถึง 5 เคสใน 30 วันแรก → ออกโค้ดโปรโมทฟรี 3 วัน + แจ้งเตือน (คนละครั้ง)
// เปิดรับงานก่อนมีระบบนี้ (ไม่มี listed_at) → ตั้ง listed_at = วันนี้ แล้วเริ่มนับจากวันนี้
export async function lowJobsBoostCodes(now = Date.now()): Promise<number> {
  const DAY = 86400_000;
  const given = new Set((await listBoostCodes()).filter((c) => c.reason === "low_jobs_30d").map((c) => c.parttime_id));
  const { completedBetween } = await import("@/lib/bookings/day");
  const { notify } = await import("@/lib/bookings");
  let n = 0;
  for (const a of await listApplicants("verified")) {
    const x = extraOf(a);
    if (!x.listed || given.has(a.id)) continue;
    if (!x.listed_at) { await saveProfile(a.id, { listed_at: new Date(now).toISOString() }); continue; }
    const start = Date.parse(x.listed_at);
    if (now < start + FREE_BOOST.windowDays * DAY) continue;
    const jobs = await completedBetween(a.id, new Date(start), new Date(start + FREE_BOOST.windowDays * DAY));
    if (jobs >= FREE_BOOST.minJobs) continue;
    const c = await issueBoostCode(a, "low_jobs_30d", { jobs });
    if (!c) continue;
    n++;
    await notify({ user_type: "parttime", user_id: a.id, kind: "boost", title: `ได้โค้ดโปรโมทฟรี ${c.days} วัน`, body: `30 วันแรกได้งาน ${jobs} เคส · ใช้โค้ด ${c.code} ขึ้นหน้าแนะนำฟรี (กด “โปรโมทโปรไฟล์” ในหน้าโปรไฟล์)`, url: `/join/profile/${a.mb_code}` }).catch(() => {});
  }
  return n;
}
