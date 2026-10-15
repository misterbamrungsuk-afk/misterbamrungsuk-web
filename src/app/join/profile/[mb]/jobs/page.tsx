import { notFound } from "next/navigation";
import { TRAINING } from "@/lib/join/training";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, loadPt, ptHref } from "../_pt";
import { JobPost } from "../_ptc";

export const dynamic = "force-dynamic";
export const metadata = { title: "งานของฉัน — Mister Bamrungsuk" };

// บอร์ด ProviderJobboard — ประกาศ "วันนี้ว่าง" ของฉัน + งานที่ลูกค้าส่งมา (ยังว่างจนกว่าจะเปิดให้บริการ)
export default async function JobsPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const p0 = c.x.photos?.[0] ?? c.row.docs.photo ?? "";
  const photo = p0 ? `/api/join/file?mb=${c.mb}&path=${encodeURIComponent(p0)}${c.t ? `&t=${encodeURIComponent(c.t)}` : ""}` : "";

  return (
    <PtPage>
      <PtHead back={ptHref(c)} title="งานของฉัน" />
      <div className="px-4 flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start">
        <JobPost mb={c.mb} t={c.t} init={c.x.post ?? null} photo={photo} nickname={c.row.nickname} openDate={TRAINING.openService} />
        <div className="flex flex-col gap-4 min-w-0">
          <div className="rounded-[18px] bg-[#211a18] flex flex-col gap-3" style={{ padding: 16 }}>
            <div className="flex gap-2" role="list">
              {[["งานใหม่", true], ["ยืนยันแล้ว", false], ["เสร็จแล้ว", false]].map(([l, on]) => (
                <span key={String(l)} role="listitem" className="rounded-full text-[13px]" style={{ padding: "6px 12px", background: on ? "#e8c472" : "#251d1b", color: on ? "#1b130b" : "#d9c9b4", fontWeight: on ? 600 : 300 }}>{l} 0</span>
              ))}
            </div>
            <span className="text-[14px] font-light text-[#d9c9b4]">ยังไม่มีงาน · ลูกค้าเริ่มจองได้ตั้งแต่ {TRAINING.openService} หลังคุณผ่านอบรม</span>
          </div>
          <div className="rounded-[18px] bg-[#211a18] flex flex-col gap-1" style={{ padding: 16 }}>
            <span className="font-semibold">เคล็ดลับ</span>
            <span className="text-[14px] font-light text-[#d9c9b4]">ลงประกาศ “วันนี้ว่าง” พร้อมเวลาและโซนชัดเจน · รูปโปรไฟล์หลักจะแสดงคู่กับประกาศ</span>
          </div>
        </div>
      </div>
      <PtNav c={c} active="jobs" />
    </PtPage>
  );
}
