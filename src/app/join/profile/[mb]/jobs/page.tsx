import Link from "next/link";
import { notFound } from "next/navigation";
import { getEarnings } from "@/lib/join/earnings-settings";
import { TRAINING } from "@/lib/join/training";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, baht, loadPt, ptHref } from "../_pt";
import { JobPost } from "../_ptc";
import { PtIncoming, PtPosts, PtQuick } from "../_ptc3";
import { GATE_MSG, GATE_SHORT, isPtActive } from "@/lib/join/pt-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "ประกาศงาน — Mister Bamrungsuk" };

// บอร์ด ProviderJobboard — แท็บ · การ์ดประกาศ "วันนี้ว่าง" · คนที่สนใจ · + สร้างประกาศใหม่
export default async function JobsPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const p0 = c.x.photos?.[0] ?? c.row.docs.photo ?? "";
  const photo = p0 ? `/api/join/file?mb=${c.mb}&path=${encodeURIComponent(p0)}${c.t ? `&t=${encodeURIComponent(c.t)}` : ""}` : "";
  const cfg = await getEarnings();
  const top = c.x.tier === "top";
  const svc = c.row.package === "B" ? cfg.price3h.massage : cfg.price3h.eat;
  const active = isPtActive(c.x);
  const meta = `${top ? "TOP" : "Silver"} · 3 ชม. ${baht(top ? svc.top : svc.silver)} · ${c.row.package === "B" ? "สายนวด" : "สายกินเที่ยว"}`;

  return (
    <PtPage>
      <PtHead back={ptHref(c)} title="งานและประกาศ" />
      <PtQuick mb={c.mb} t={c.t} />
      <PtIncoming mb={c.mb} t={c.t} />
      {active && <PtPosts mb={c.mb} t={c.t} />}
      <div className="flex gap-2 px-4 pb-3.5">
        <span className="h-9 rounded-full text-[13px] flex items-center bg-[#f3ead9] text-[#1b130b] font-semibold" style={{ padding: "0 16px" }}>ประกาศของฉัน</span>
        <span className="h-9 rounded-full text-[13px] flex items-center bg-[#2c1a1f] font-light" style={{ padding: "0 16px" }}>บอกลูกค้าว่าวันนี้คุณว่าง</span>
      </div>
      <div className="px-4 flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start">
        {/* ยังไม่อนุมัติ/ยังไม่เปิดโปรไฟล์ → ลงประกาศไม่ได้ (API ตอบ 409) */}
        {active
          ? <JobPost mb={c.mb} t={c.t} init={c.x.post ?? null} photo={photo} meta={meta} />
          : <div className="rounded-3xl bg-[#211a18] flex flex-col gap-1" style={{ padding: "20px 16px" }}><b className="font-semibold text-[#e8c472]">{GATE_SHORT}</b><span className="text-[14px] font-light text-[#d9c9b4]">{GATE_MSG} (เปิดให้บริการ {TRAINING.openService})</span></div>}
        <div className="min-w-0">
          {/* ยังไม่มีระบบให้ลูกค้ากดสนใจประกาศ "วันนี้ว่าง" → ไม่แสดงตัวนับ "คนที่สนใจ" ที่เป็น 0 ตลอด · ลูกค้าที่เห็นประกาศจะจองเข้ามาเป็น "งานเข้า" ด้านบน */}
          {active && <div className="rounded-[20px] bg-[#272013] text-[14px] font-light text-[#d9c9b4]" style={{ padding: "16px 14px" }}>ลูกค้าที่เห็นประกาศจะจองเข้ามาทันที · งานใหม่ขึ้นที่ &quot;งานเข้า&quot; ด้านบนและในแจ้งเตือน</div>}
          <Link href={ptHref(c, "posts")} className="mt-4 rounded-[18px] bg-[#211a18] flex items-center gap-3 hover:text-inherit" style={{ padding: 16 }}>
            <span className="flex-1 min-w-0 flex flex-col"><span className="font-semibold">โพสต์ของฉัน</span><span className="text-[13px] font-light text-[#d9c9b4] truncate">{c.x.listing?.title || "หัวข้อ · กติกา · รูปปก (บัญชีละ 1 โพสต์)"}</span></span>
            <span className="text-[#e8c472]" aria-hidden="true">›</span>
          </Link>
        </div>
      </div>
      <PtNav c={c} active="jobs" />
    </PtPage>
  );
}
