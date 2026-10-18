import { notFound } from "next/navigation";
import { STRIKE_EXPIRE_DAYS, STRIKE_LIMIT } from "@/lib/strikes";
import { strikesWithAppeals } from "@/lib/appeals";
import { lineAddUrl } from "@/lib/join/config";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, loadPt, ptHref } from "../_pt";
import { AppealForm } from "./appeal-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "สถานะบัญชี — Mister Bamrungsuk" };

// บอร์ด P-Strikes — ใบเตือน n / 3 · รายการ · กติกาไม่มาตามนัด · ยื่นอุทธรณ์ในแอป (ใบละครั้ง · lib/appeals)
// ใบเตือนจริงมาจากผลตัดสินผิดนัดของแอดมิน (lib/noshow → provider_strikes · provider_id = id ใบสมัคร) · นับเฉพาะที่ยังไม่หมดอายุ และไม่ถูกยกเลิกจากอุทธรณ์
const REASON: Record<string, string> = { no_show: "ไม่มาตามนัด" };
const date = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
const AP: Record<string, [string, string]> = { pending: ["ส่งอุทธรณ์แล้ว · รอทีมงานตรวจ (ภายใน 48 ชม.)", "#e8c472"], accepted: ["อุทธรณ์ผ่าน · ยกเลิกใบเตือนนี้แล้ว", "#7fd6a3"], rejected: ["อุทธรณ์ไม่ผ่าน", "#FF8A97"] };

export default async function StrikesPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const { strikes, count: n } = await strikesWithAppeals(c.row.id).catch(() => ({ strikes: [], count: 0 }));
  const card = "rounded-2xl bg-[#211a18] flex flex-col gap-1";
  return (
    <PtPage>
      <PtHead back={ptHref(c, "settings")} title="สถานะบัญชี" />
      <div className="px-4 flex flex-col gap-3.5 max-w-[560px]">
        <div className="rounded-[22px]" style={{ padding: 18, border: `1px solid ${n ? "#ff8a97" : "rgba(127,214,163,.6)"}`, background: n ? "rgba(224,36,60,.06)" : "rgba(127,214,163,.05)" }}>
          <div className="flex justify-between items-baseline"><span className="text-[13px] font-semibold" style={{ color: n ? "#FF8A97" : "#7fd6a3" }}>ใบเตือน</span><b className="font-bold text-[30px]" data-strike-count={n}>{n}<span className="text-[16px] text-[#d9c9b4] font-thin"> / {STRIKE_LIMIT}</span></b></div>
          <div className="flex gap-1.5 mt-2.5">{Array.from({ length: STRIKE_LIMIT }, (_, i) => <span key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i < n ? "#e8c472" : "rgba(243,234,217,0.07)" }} />)}</div>
          <div className="text-[13px] text-[#d9c9b4] mt-3 leading-[1.55] font-light">ถ้าครบ {STRIKE_LIMIT} ครั้ง บัญชีจะถูกระงับ ถ้าไม่โดนเพิ่มภายใน {STRIKE_EXPIRE_DAYS} วัน ใบเตือนจะหมดอายุเอง</div>
        </div>
        {strikes.length ? strikes.map((s) => {
          const voided = s.appeal?.status === "accepted";
          return (
            <div key={s.id} className={card} style={{ padding: 16, opacity: voided ? 0.7 : 1 }}>
              <div className="flex justify-between items-baseline gap-2"><b className="font-medium" style={voided ? { textDecoration: "line-through" } : undefined}>{REASON[s.reason] ?? s.reason}</b><span className="text-[12px] font-light text-[#b5a596]">{date(s.created_at)}</span></div>
              <div className="text-[13px] text-[#d9c9b4] font-light">{s.ref ? `การจอง ${s.ref} · ` : ""}{voided ? "ไม่นับแล้ว" : `หักคะแนน ${s.points} · หมดอายุ ${date(new Date(Date.parse(s.created_at) + STRIKE_EXPIRE_DAYS * 86400_000).toISOString())}`}</div>
              {s.appeal
                ? <div className="text-[13px] mt-1" style={{ color: AP[s.appeal.status][1] }}>{AP[s.appeal.status][0]}{s.appeal.status === "rejected" && s.appeal.decision_note ? ` · ${s.appeal.decision_note}` : ""}</div>
                : <AppealForm mb={c.mb} t={c.t} strikeId={s.id} />}
            </div>
          );
        }) : <div className={card} style={{ padding: 16 }}><b className="font-medium">ยังไม่มีใบเตือน</b><div className="text-[13px] text-[#d9c9b4] font-light">รักษามาตรฐานต่อไป · ใบเตือนจะแสดงที่นี่พร้อมวันหมดอายุ</div></div>}
        <div className={card} style={{ padding: 16 }}>
          <b className="font-medium">กติกา: ไม่มาตามนัด</b>
          <div className="text-[13px] text-[#d9c9b4] leading-[1.55] font-light">ไม่มาตามนัด → ใบเตือน 1 ครั้ง + หักคะแนน ลูกค้าได้เงินคืนเต็ม 100% · ใบเตือนจะออกหลังแอดมินตรวจหลักฐานทั้ง 2 ฝ่ายแล้วเท่านั้น</div>
        </div>
        <div className={card} style={{ padding: 16 }}>
          <b className="font-medium">การอุทธรณ์</b>
          <div className="text-[13px] text-[#d9c9b4] leading-[1.55] font-light">กด &quot;ยื่นอุทธรณ์&quot; ที่ใบเตือน · เขียนเหตุผลและแนบรูปหลักฐานได้ · ใบละ 1 ครั้ง · ทีมงานตรวจภายใน 48 ชม. ผลจะแจ้งในแจ้งเตือน · ถ้าอุทธรณ์ผ่าน ใบเตือนใบนั้นจะไม่นับ</div>
          <a href={lineAddUrl()} target="_blank" rel="noopener" className="self-start min-h-10 inline-flex items-center text-[13px] text-[#e8c472] font-light">มีคำถาม ติดต่อทีมงานทาง LINE ›</a>
        </div>
      </div>
      <PtNav c={c} active="settings" />
    </PtPage>
  );
}
