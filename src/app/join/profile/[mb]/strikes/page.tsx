import { notFound } from "next/navigation";
import { STRIKE_EXPIRE_DAYS, STRIKE_LIMIT } from "@/lib/strikes";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, loadPt, ptHref } from "../_pt";

export const dynamic = "force-dynamic";
export const metadata = { title: "สถานะบัญชี — Mister Bamrungsuk" };

// บอร์ด P-Strikes — ใบเตือน n / 3 · รายการ · กติกาไม่มาตามนัด · ยื่นอุทธรณ์ (เปิดเมื่อมีใบเตือน)
// ผู้สมัครยังไม่เริ่มรับงาน → 0 ใบเตือน · กติกาตาม lib/strikes (ครบ 3 ระงับ · หมดอายุ 90 วัน)
export default async function StrikesPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const n = 0;
  const card = "rounded-2xl bg-[#211a18] flex flex-col gap-1";
  return (
    <PtPage>
      <PtHead back={ptHref(c, "settings")} title="สถานะบัญชี" />
      <div className="px-4 flex flex-col gap-3.5 max-w-[560px]">
        <div className="rounded-[22px]" style={{ padding: 18, border: `1px solid ${n ? "#ff8a97" : "rgba(127,214,163,.6)"}`, background: n ? "rgba(224,36,60,.06)" : "rgba(127,214,163,.05)" }}>
          <div className="flex justify-between items-baseline"><span className="text-[13px] font-semibold" style={{ color: n ? "#FF8A97" : "#7fd6a3" }}>ใบเตือน</span><b className="font-bold text-[30px]">{n}<span className="text-[16px] text-[#d9c9b4] font-thin"> / {STRIKE_LIMIT}</span></b></div>
          <div className="flex gap-1.5 mt-2.5">{Array.from({ length: STRIKE_LIMIT }, (_, i) => <span key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i < n ? "#e8c472" : "rgba(243,234,217,0.07)" }} />)}</div>
          <div className="text-[13px] text-[#d9c9b4] mt-3 leading-[1.55] font-light">ถ้าครบ {STRIKE_LIMIT} ครั้ง บัญชีจะถูกระงับอัตโนมัติ ถ้าไม่โดนเพิ่มภายใน {STRIKE_EXPIRE_DAYS} วัน ใบเตือนจะหมดอายุเอง</div>
        </div>
        <div className={card} style={{ padding: 16 }}><b className="font-medium">ยังไม่มีใบเตือน</b><div className="text-[13px] text-[#d9c9b4] font-light">รักษามาตรฐานต่อไป · ใบเตือนจะแสดงที่นี่พร้อมวันหมดอายุ</div></div>
        <div className={card} style={{ padding: 16 }}>
          <b className="font-medium">กติกา: ไม่มาตามนัด</b>
          <div className="text-[13px] text-[#d9c9b4] leading-[1.55] font-light">ไม่มาตามนัด → ใบเตือน 1 ครั้ง + หักคะแนน ลูกค้าได้เงินคืนเต็ม 100% · ใบเตือนจะออกหลังแอดมินตรวจหลักฐานทั้ง 2 ฝ่ายแล้วเท่านั้น</div>
        </div>
        <div className={card} style={{ padding: 16 }}>
          <b className="font-medium text-[16px]">ยื่นอุทธรณ์</b>
          <div className="text-[13px] text-[#d9c9b4] font-light">เปิดให้ยื่นเมื่อมีใบเตือน · แนบเหตุผลและหลักฐาน แอดมินพิจารณาภายใน 48 ชม.</div>
        </div>
        <button type="button" disabled className="h-14 rounded-2xl font-semibold text-[17px] text-[#b5a596]" style={{ border: "1px solid rgba(243,234,217,0.14)" }}>ส่งอุทธรณ์</button>
      </div>
      <PtNav c={c} active="settings" />
    </PtPage>
  );
}
