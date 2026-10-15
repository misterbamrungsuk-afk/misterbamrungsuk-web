"use client";

// ตัวคำนวณรายได้ (บอร์ด JoinEarnings) · มือถือ = คอลัมน์เดียว + ปุ่มติดล่าง · lg = ตัวเลือกซ้าย / ผลลัพธ์ขวาแบบ sticky
import { Fragment, useState } from "react";
import { BrandHeader, Button, Card, Chip, Container, Icon, Shell, StickyAction, StickySpacer, baht } from "@/components/mb/ui";
import { EARNINGS, type EarnSvc, type EarnTier } from "@/lib/join/config";
import { pctFor, tierLabel } from "@/lib/join/earnings-shared";
import type { EarningsSettings } from "@/lib/join/earnings-settings";

// ตัวเลขทั้งหมดมาจากหน้าแอดมิน "ราคาและส่วนแบ่ง" (cfg)
const SVC_LABEL: Record<EarnSvc, string> = { eat: "เพื่อนกินเที่ยว", massage: "เพื่อนกินเที่ยว · นวด" };
const TIERS: [EarnTier, string][] = [["top", "TOP"], ["silver", "Silver"]];

export function EarningsCalc({ cfg }: { cfg: Omit<EarningsSettings, "history"> }) {
  const SVCS = (["eat", "massage"] as EarnSvc[]).map((k) => [k, { label: SVC_LABEL[k], ...cfg.price3h[k] }] as const);
  const [svc, setSvc] = useState<EarnSvc>("massage");
  const [tier, setTier] = useState<EarnTier>("top");
  const [cases, setCases] = useState<number>(15);
  const price = cfg.price3h[svc][tier];
  const pct = pctFor(cfg.tiers, cases);
  const perCase = (price * pct) / 100;
  const monthly = cases * perCase;

  const actions = (
    <>
      <Button href={`/join/pay?pkg=${svc === "massage" ? "B" : "A"}`}>สมัครเข้าอบรม</Button>
      <Button href="/" variant="text">ดูตัวอย่างแอปที่ลูกค้าเห็น</Button>
    </>
  );

  return (
    <Shell header={<BrandHeader tone="bar" />} footer={false}>
      <Container className="pt-5 md:pt-8">
        <Button href="/join" variant="text" block={false} className="!px-0 -ml-0.5"><Icon d="m15 18-6-6 6-6" /> กลับหน้ารับสมัคร</Button>
        <div className="mt-2 mb-5 md:mb-8">
          <div className="text-[12px] font-light tracking-[2px] text-mb-gold">รายได้และส่วนแบ่ง</div>
          <h1 className="mb-h text-[26px] md:text-[34px] leading-[1.3]">คุณจะได้เท่าไหร่ต่อเดือน</h1>
          <p className="mb-s mt-1.5 mb-0 md:text-[15px]">ลองเลือกสายงาน ระดับ และจำนวนนัดต่อเดือน ตัวเลขเปลี่ยนทันที</p>
        </div>

        <div className="grid gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:items-start">
          <div className="flex flex-col gap-[18px] min-w-0">
            <Card className="flex flex-col gap-3.5">
              <fieldset className="border-0 p-0 m-0">
                <legend className="mb-lbl">สายงาน</legend>
                <div className="grid grid-cols-2 gap-2">{SVCS.map(([k, v]) => <Chip key={k} on={svc === k} onClick={() => setSvc(k)}>{v.label}</Chip>)}</div>
              </fieldset>
              <fieldset className="border-0 p-0 m-0">
                <legend className="mb-lbl">ระดับ (แอดมินกำหนดหลังอบรม · เริ่มต้น Silver)</legend>
                <div className="grid grid-cols-2 gap-2">{TIERS.map(([k, t]) => <Chip key={k} on={tier === k} onClick={() => setTier(k)}>{t}</Chip>)}</div>
              </fieldset>
              <fieldset className="border-0 p-0 m-0">
                <legend className="mb-lbl">จำนวนนัดต่อเดือน</legend>
                <div className="grid grid-cols-6 gap-1.5">{EARNINGS.caseOptions.map((c) => <Chip key={c} on={cases === c} onClick={() => setCases(c)} className="!px-0">{c}</Chip>)}</div>
              </fieldset>
            </Card>

            {/* ผลลัพธ์ (มือถือแสดงตรงนี้ · lg ย้ายไปแผงขวา) */}
            <Result className="lg:hidden" monthly={monthly} cases={cases} price={price} pct={pct} perCase={perCase} />

            <Card>
              <div className="font-semibold mb-2">ราคาต่อนัด 3 ชม. (ลูกค้าจ่าย)</div>
              <div className="grid gap-1.5 text-[14px]" style={{ gridTemplateColumns: "1.4fr 1fr 1fr" }}>
                <span className="mb-xs">สายงาน</span><span className="mb-xs">TOP</span><span className="mb-xs">Silver</span>
                {SVCS.map(([k, v]) => <Fragment key={k}><span>{v.label}</span><span>{baht(v.top)}</span><span>{baht(v.silver)}</span></Fragment>)}
              </div>
              <div className="mb-xs mt-2">{`5 ชม. = ×${cfg.fiveHourMultiplier} · ทิปจากลูกค้าได้เต็ม ${cfg.tipPct}%`}</div>
            </Card>

            <Card>
              <div className="font-semibold mb-2">ส่วนแบ่งของคุณ (นับนัดในเดือน)</div>
              {cfg.tiers.map((t) => (
                <div key={t.min} className="flex justify-between items-center gap-3 py-2 border-t border-[rgba(243,234,217,0.07)]"><span>{tierLabel(t)}</span><b className="font-semibold" style={{ color: t.pct === pct ? "#e8c472" : "#f3ead9" }}>{`${t.pct}%`}</b></div>
              ))}
              <div className="mb-xs">ทำนัดมากขึ้น ส่วนแบ่งขยับขึ้นทั้งเดือน · ส่วนที่เหลือเป็นค่าแพลตฟอร์ม การตลาด ประกัน และทีมดูแลความปลอดภัย</div>
            </Card>

            <Card className="flex flex-col gap-2">
              <div className="font-semibold">ได้เงินเมื่อไร</div>
              <div className="mb-s">• ลูกค้าจ่ายเข้าระบบก่อนนัด เงินพักไว้กับเรา<br />{`• จบนัดแล้วโอนส่วนของคุณ${cfg.payout}`}<br />{cfg.noShow.includes("เต็ม") ? "• ลูกค้าไม่มาตามนัด คุณยังได้ส่วนของคุณเต็ม" : `• ลูกค้าไม่มาตามนัด: ${cfg.noShow}`}<br />• ดูรายได้และถอนเงินในแอปได้ทุกวัน</div>
            </Card>
            <p className="mb-xs m-0">ตัวเลขเป็นการประมาณ ขึ้นกับจำนวนนัดจริงและระดับที่ได้รับ · ราคาและส่วนแบ่งตามประกาศล่าสุดของแพลตฟอร์ม</p>
          </div>

          <aside className="hidden lg:flex lg:sticky lg:top-6 flex-col gap-4">
            <Result monthly={monthly} cases={cases} price={price} pct={pct} perCase={perCase} />
            <div className="flex flex-col gap-2">{actions}</div>
          </aside>
        </div>
        <StickySpacer />
      </Container>
      <div className="lg:hidden"><StickyAction>{actions}</StickyAction></div>
    </Shell>
  );
}

function Result({ monthly, cases, price, pct, perCase, className = "" }: { monthly: number; cases: number; price: number; pct: number; perCase: number; className?: string }) {
  return (
    <section aria-live="polite" className={`rounded-[20px] p-[18px] md:p-6 flex flex-col gap-2 bg-[linear-gradient(150deg,#3a2a17,#211a18_70%)] ${className}`}>
      <div className="mb-xs !text-mb-text2">รายได้โดยประมาณต่อเดือน</div>
      <div className="mb-h text-[38px] md:text-[44px] text-mb-gold [font-variant-numeric:tabular-nums]" style={{ lineHeight: 1.6 }}>{baht(monthly)}</div>
      <div className="mb-s">{`${cases} นัด × ${baht(price)} × ส่วนแบ่ง ${pct}%`}</div>
      <div className="mb-s flex justify-between items-center gap-3 border-t border-[rgba(243,234,217,0.07)] pt-2"><span>ได้ต่อนัด</span><b className="font-semibold text-[#f3ead9]">{baht(perCase)}</b></div>
    </section>
  );
}
