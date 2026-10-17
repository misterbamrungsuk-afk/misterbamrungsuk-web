import { notFound } from "next/navigation";
import { STRIKE_EXPIRE_DAYS, STRIKE_LIMIT } from "@/lib/strikes";
import { listStrikes } from "@/lib/noshow";
import { lineAddUrl } from "@/lib/join/config";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, loadPt, ptHref } from "../_pt";

export const dynamic = "force-dynamic";
export const metadata = { title: "สถานะบัญชี — Mister Bamrungsuk" };

// บอร์ด P-Strikes — ใบเตือน n / 3 · รายการ · กติกาไม่มาตามนัด · ยื่นอุทธรณ์ (ทาง LINE ทีมงาน — ยังไม่มีระบบในแอป)
// ใบเตือนจริงมาจากผลตัดสินผิดนัดของแอดมิน (lib/noshow → provider_strikes · provider_id = id ใบสมัคร) · นับเฉพาะที่ยังไม่หมดอายุ
const REASON: Record<string, string> = { no_show: "ไม่มาตามนัด" };
const date = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

export default async function StrikesPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const since = Date.now() - STRIKE_EXPIRE_DAYS * 86400_000;
  const strikes = (await listStrikes(c.row.id).catch(() => [])).filter((s) => Date.parse(s.created_at) >= since);
  const n = strikes.length;
  const card = "rounded-2xl bg-[#211a18] flex flex-col gap-1";
  return (
    <PtPage>
      <PtHead back={ptHref(c, "settings")} title="สถานะบัญชี" />
      <div className="px-4 flex flex-col gap-3.5 max-w-[560px]">
        <div className="rounded-[22px]" style={{ padding: 18, border: `1px solid ${n ? "#ff8a97" : "rgba(127,214,163,.6)"}`, background: n ? "rgba(224,36,60,.06)" : "rgba(127,214,163,.05)" }}>
          <div className="flex justify-between items-baseline"><span className="text-[13px] font-semibold" style={{ color: n ? "#FF8A97" : "#7fd6a3" }}>ใบเตือน</span><b className="font-bold text-[30px]">{n}<span className="text-[16px] text-[#d9c9b4] font-thin"> / {STRIKE_LIMIT}</span></b></div>
          <div className="flex gap-1.5 mt-2.5">{Array.from({ length: STRIKE_LIMIT }, (_, i) => <span key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i < n ? "#e8c472" : "rgba(243,234,217,0.07)" }} />)}</div>
          <div className="text-[13px] text-[#d9c9b4] mt-3 leading-[1.55] font-light">ถ้าครบ {STRIKE_LIMIT} ครั้ง บัญชีจะถูกระงับ ถ้าไม่โดนเพิ่มภายใน {STRIKE_EXPIRE_DAYS} วัน ใบเตือนจะหมดอายุเอง</div>
        </div>
        {n ? strikes.map((s) => (
          <div key={s.id} className={card} style={{ padding: 16 }}>
            <div className="flex justify-between items-baseline gap-2"><b className="font-medium">{REASON[s.reason] ?? s.reason}</b><span className="text-[12px] font-light text-[#b5a596]">{date(s.created_at)}</span></div>
            <div className="text-[13px] text-[#d9c9b4] font-light">{s.ref ? `การจอง ${s.ref} · ` : ""}หักคะแนน {s.points} · หมดอายุ {date(new Date(Date.parse(s.created_at) + STRIKE_EXPIRE_DAYS * 86400_000).toISOString())}</div>
          </div>
        )) : <div className={card} style={{ padding: 16 }}><b className="font-medium">ยังไม่มีใบเตือน</b><div className="text-[13px] text-[#d9c9b4] font-light">รักษามาตรฐานต่อไป · ใบเตือนจะแสดงที่นี่พร้อมวันหมดอายุ</div></div>}
        <div className={card} style={{ padding: 16 }}>
          <b className="font-medium">กติกา: ไม่มาตามนัด</b>
          <div className="text-[13px] text-[#d9c9b4] leading-[1.55] font-light">ไม่มาตามนัด → ใบเตือน 1 ครั้ง + หักคะแนน ลูกค้าได้เงินคืนเต็ม 100% · ใบเตือนจะออกหลังแอดมินตรวจหลักฐานทั้ง 2 ฝ่ายแล้วเท่านั้น</div>
        </div>
        {/* อุทธรณ์ยังไม่มีระบบในแอป → เปิดคำอธิบาย + ช่องทาง LINE ทีมงาน (ไม่ทำปุ่มหลอก) */}
        <details className="rounded-2xl bg-[#211a18] group" style={{ border: "1px solid rgba(243,234,217,0.14)" }}>
          <summary className="list-none cursor-pointer min-h-14 flex items-center justify-center font-semibold text-[17px] text-[#e8c472] [&::-webkit-details-marker]:hidden">ส่งอุทธรณ์ <span className="ml-1.5 text-[14px] transition-transform group-open:rotate-90" aria-hidden="true">›</span></summary>
          <div className="flex flex-col gap-2.5" style={{ padding: "0 16px 16px" }}>
            <p className="m-0 text-[13.5px] text-[#d9c9b4] font-light leading-[1.6]">{n ? "ยื่นอุทธรณ์ทาง LINE ทีมงาน: แจ้งรหัส" : "ตอนนี้ยังไม่มีใบเตือนให้อุทธรณ์ · ถ้ามีใบเตือนในอนาคต ยื่นได้ทาง LINE ทีมงาน: แจ้งรหัส"} <b className="text-[#f3ead9]">{c.mb}</b> เลขการจอง เหตุผล และหลักฐาน (รูป/แชท) · แอดมินพิจารณาภายใน 48 ชม.</p>
            <a href={lineAddUrl()} target="_blank" rel="noopener" className="min-h-12 rounded-[14px] bg-[#06c755] text-white text-[15px] font-semibold grid place-items-center hover:text-white">ติดต่อทีมงานทาง LINE</a>
          </div>
        </details>
      </div>
      <PtNav c={c} active="settings" />
    </PtPage>
  );
}
