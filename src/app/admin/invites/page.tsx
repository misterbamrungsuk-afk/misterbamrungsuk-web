import { listInvites } from "@/lib/join/invites";
import { extraOf, listApplicants } from "@/lib/join/store";
import { InvitesAdmin } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "ลิงก์เชิญ · แอดมิน Mister Bamrungsuk" };

// บอร์ด AdminInvites — สร้างลิงก์เชิญ (ชื่อ · จำนวนครั้ง · วันหมดอายุ) · รายการลิงก์ · ผู้สมัครล่าสุดจากลิงก์เชิญ
export default async function InvitesAdminPage() {
  const [invites, apps] = await Promise.all([listInvites(), listApplicants().catch(() => [])]);
  const recent = apps
    .map((a) => ({ a, inv: extraOf(a).invite }))
    .filter((r) => r.inv)
    .slice(0, 20)
    .map(({ a, inv }) => ({ name: `${a.first_name} ${a.last_name.slice(0, 1)}.`, mb: a.mb_code, src: invites.find((i) => i.code === inv)?.name ?? inv!, at: a.created_at }));
  return <InvitesAdmin initial={invites} recent={recent} />;
}
