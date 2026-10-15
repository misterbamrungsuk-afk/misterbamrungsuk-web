"use client";

// ตัวคำนวณรายได้ (บอร์ด JoinEarnings) · มือถือ = คอลัมน์เดียว + ปุ่มติดล่าง · lg = ตัวเลือกซ้าย / ผลลัพธ์ขวาแบบ sticky
import { useState } from "react";
import { BrandHeader, Button, Card, Chip, Container, Icon, Row, Shell, StickyAction, StickySpacer, baht } from "@/components/mb/ui";
import { EARNINGS, sharePct, type EarnSvc, type EarnTier } from "@/lib/join/config";

const SVCS = Object.entries(EARNINGS.price3h) as [EarnSvc, (typeof EARNINGS.price3h)[EarnSvc]][];
const TIERS: [EarnTier, string][] = [["top", "TOP"], ["silver", "Silver"]];

export function EarningsCalc() {
  const [svc, setSvc] = useState<EarnSvc>("massage");
  const [tier, setTier] = useState<EarnTier>("top");
  const [cases, setCases] = useState<number>(15);
  const price = EARNINGS.price3h[svc][tier];
  const pct = sharePct(cases);
  const perCase = (price * pct) / 100;
  const monthly = cases * perCase;

  const actions = (
    <>
      <Button href={`/join/apply?pkg=${svc === "massage" ? "B" : "A"}`}>สมัครเข้าอบรม</Button>
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
              <h2 className="font-semibold mb-2 text-[15px]">ราคาต่อนัด 3 ชม. (ลูกค้าจ่าย)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-[14px] border-collapse [font-variant-numeric:tabular-nums]">
                  <thead><tr className="text-left mb-xs"><th className="font-light py-1 pr-2">สายงาน</th><th className="font-light py-1 pr-2">TOP</th><th className="font-light py-1">Silver</th></tr></thead>
                  <tbody>{SVCS.map(([k, v]) => <tr key={k} className={k === svc ? "text-mb-gold" : ""}><td className="py-1 pr-2">{v.label}</td><td className="py-1 pr-2">{baht(v.top)}</td><td className="py-1">{baht(v.silver)}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="mb-xs mt-2">5 ชม. = ×{EARNINGS.fiveHourMultiplier} · ทิปจากลูกค้าได้เต็ม {EARNINGS.tipPct}%</div>
            </Card>

            <Card>
              <h2 className="font-semibold mb-2 text-[15px]">ส่วนแบ่งของคุณ (นับนัดในเดือน)</h2>
              {EARNINGS.tiers.map((t) => (
                <Row key={t.label} k={t.label} v={<span className={t.pct === pct ? "text-mb-gold" : ""}>{t.pct}%</span>} className="py-2 border-t border-[rgba(243,234,217,0.07)]" />
              ))}
              <div className="mb-xs">ทำนัดมากขึ้น ส่วนแบ่งขยับขึ้นทั้งเดือน · ส่วนที่เหลือเป็นค่าแพลตฟอร์ม การตลาด ประกัน และทีมดูแลความปลอดภัย</div>
            </Card>

            <Card className="flex flex-col gap-2">
              <h2 className="font-semibold text-[15px]">ได้เงินเมื่อไร</h2>
              <ul className="mb-s m-0 pl-5 list-disc">
                <li>ลูกค้าจ่ายเข้าระบบก่อนนัด เงินพักไว้กับเรา</li>
                <li>{EARNINGS.payout}</li>
                <li>ลูกค้าไม่มาตามนัด คุณยังได้ส่วนของคุณเต็ม</li>
                <li>ดูรายได้และถอนเงินในแอปได้ทุกวัน</li>
              </ul>
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
      <div className="mb-h text-[38px] md:text-[44px] text-mb-gold [font-variant-numeric:tabular-nums]">{baht(monthly)}</div>
      <div className="mb-s">{cases} นัด × {baht(price)} × ส่วนแบ่ง {pct}%</div>
      <Row k={<span className="mb-s">ได้ต่อนัด</span>} v={baht(perCase)} className="border-t border-[rgba(243,234,217,0.07)] pt-2" />
    </section>
  );
}
