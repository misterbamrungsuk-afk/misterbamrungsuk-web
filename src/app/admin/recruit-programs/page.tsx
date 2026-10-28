import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { PageHead } from "../admin-nav";
import { extraOf, listApplicants } from "@/lib/join/store";
import { listReps } from "@/lib/member/store";
import { listMonthlyBonuses } from "@/lib/member/recruit-bonus";
import { PROGRAM_KEYS, getPrograms, type ProgramKey } from "@/lib/member/recruit-programs";
import { ProgramsAdmin, type PtRow } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "โปรแกรม Recruit · กำหนดราคา — แอดมิน" };

// โปรแกรม Recruit แยกส่วน (28 ต.ค. 2569): หา Part-time · Partner · Collab · Member — CEO กำหนดราคา/เปิดปิด · ดูผลงานแยกแต่ละส่วน
export default async function RecruitProgramsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  const sp = await searchParams;
  const tab: ProgramKey = (PROGRAM_KEYS as readonly string[]).includes(sp.p ?? "") ? (sp.p as ProgramKey) : "parttime";
  const [progs, apps, reps, mb] = await Promise.all([getPrograms(), listApplicants().catch(() => []), listReps().catch(() => []), listMonthlyBonuses().catch(() => [])]);
  const repBy = new Map(reps.map((r) => [r.id, r]));
  // ผู้สมัคร Part-time ที่มี Recruit แนะนำ (ผูกตอนสมัครผ่านลิงก์/เลขแนะนำ)
  const pt: PtRow[] = apps.flatMap((a) => {
    const x = extraOf(a);
    if (!x.sales_ref) return [];
    const r = repBy.get(x.sales_ref.rep_id);
    const bonus = mb.filter((b) => b.parttime_id === a.id && b.status === "approved").reduce((t, b) => t + b.amount_satang, 0);
    return [{
      id: a.id, mb: a.mb_code, name: `${a.first_name} ${a.last_name}${a.nickname ? ` (${a.nickname})` : ""}`,
      rep: r ? `${r.name} · ${r.code}` : x.sales_ref.code ?? "-", repId: r?.id ?? null, repKind: r?.kind ?? null,
      status: a.status === "rejected" ? "ไม่ผ่าน" : x.inactive ? "Non Active" : x.listed ? "เปิดรับงาน" : "รอเปิดรับงาน",
      free: !a.amount, paid: x.recruit_at ? x.recruit_satang ?? 0 : 0, paidAt: x.recruit_at ?? null, bonus, at: a.created_at,
    }];
  }).sort((a, z) => z.at.localeCompare(a.at));
  return (
    <>
      <PageHead title="โปรแกรม Recruit · กำหนดราคา" sub={`แยกส่วน: หา Part-time · Partner · Collab · Member · แก้ราคาได้เฉพาะ CEO${progs.updated_at ? ` · แก้ล่าสุด ${new Date(progs.updated_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })} โดย ${progs.updated_by}` : ""}`} />
      <ProgramsAdmin isCeo={s?.role === "ceo"} tab={tab} programs={progs} pt={pt} />
    </>
  );
}
