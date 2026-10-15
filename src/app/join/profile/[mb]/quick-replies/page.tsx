import { notFound } from "next/navigation";
import { Forbidden } from "../../../_kyc/ui";
import { PtBarHead, PtNav, PtPage, loadPt, ptHref } from "../_pt";
import { QuickReplies } from "../_ptc2";

export const dynamic = "force-dynamic";
export const metadata = { title: "ข้อความตอบกลับเร็ว — Mister Bamrungsuk" };

// บอร์ด P-QuickReplies — ตอบอัตโนมัติเมื่อไม่ว่าง + ข้อความที่บันทึกไว้ (สูงสุด 10) · กันเบอร์/LINE ทั้งหน้าเว็บและ API
export default async function QuickRepliesPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  return (
    <PtPage>
      <PtBarHead back={ptHref(c, "settings")} title="ข้อความตอบกลับเร็ว" />
      <main className="max-w-[560px]" style={{ padding: "20px 16px 0", lineHeight: 1.6 }}>
        <QuickReplies mb={c.mb} t={c.t} init={c.x.pt_settings ?? null} />
      </main>
      <PtNav c={c} active="settings" />
    </PtPage>
  );
}
