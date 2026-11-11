"use client";

// ตัวคำนวณรายได้ (บอร์ด JoinEarnings) · จัดใหม่ 11 พ.ย. 2569: เลือก 3 ขั้น → ผลลัพธ์ + แถบแบ่งรายได้ (คุณ / แพลตฟอร์ม)
// มือถือ = คอลัมน์เดียว + ปุ่มติดล่าง · lg = ตัวเลือกซ้าย / ผลลัพธ์ขวาแบบ sticky · ตัวเลขทั้งหมดมาจากแอดมิน "ราคาและส่วนแบ่ง" (cfg)
import { useState } from "react";
import { BrandHeader, Button, Card, Container, Icon, Shell, StickyAction, StickySpacer, baht } from "@/components/mb/ui";
import { EARNINGS, type EarnSvc, type EarnTier } from "@/lib/join/config";
import { pctFor, type Tier } from "@/lib/join/earnings-shared";
import type { EarningsSettings } from "@/lib/join/earnings-settings";

const SVC_LABEL: Record<EarnSvc, string> = { eat: "เพื่อนกินเที่ยว", massage: "เพื่อนกินเที่ยว · นวด" };
const LEVELS: [EarnTier, string][] = [["silver", "Silver"], ["top", "TOP"]];
const rangeOf = (t: Tier) => (t.max === null ? `${t.min} เคสขึ้นไป` : `${t.min}–${t.max} เคส`);
const GOLD = "#e8c472";

/** ปุ่มเลือกแบบแบ่งช่อง — ช่องที่เลือกเป็นทองชัด ๆ */
function Seg<T extends string | number>({ items, value, onChange, label }: { items: [T, string][]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-2xl p-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))`, background: "#171211" }}>
      {items.map(([k, l]) => {
        const on = value === k;
        return (
          <button key={String(k)} type="button" role="radio" aria-checked={on} onClick={() => onChange(k)}
            className="min-h-11 rounded-xl text-[14px] px-1 transition"
            style={on ? { background: GOLD, color: "#1b130b", fontWeight: 700, boxShadow: "0 4px 14px rgba(232,196,114,.25)" } : { color: "#d9c9b4" }}>{l}</button>
        );
      })}
    </div>
  );
}

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-2 text-[14px] font-semibold text-[#f3ead9]"><span className="w-6 h-6 rounded-full grid place-items-center text-[12px] font-bold" style={{ background: "rgba(232,196,114,.18)", color: GOLD }}>{n}</span>{children}</div>
);

export function EarningsCalc({ cfg }: { cfg: Omit<EarningsSettings, "history"> }) {
  const [svc, setSvc] = useState<EarnSvc>("eat"); // เริ่มที่จุดที่ทุกคนเริ่มจริง: กินเที่ยว · Silver
  const [tier, setTier] = useState<EarnTier>("silver");
  const [cases, setCases] = useState<number>(10);
  const price = cfg.price3h[svc][tier];
  const pct = pctFor(cfg.tiers, cases);
  const perCase = (price * pct) / 100;
  const monthly = cases * perCase;
  const activeIdx = cfg.tiers.reduce((a, t, i) => (cases >= t.min ? i : a), 0);

  const actions = (
    <>
      <Button href={`/join/pay?pkg=${svc === "massage" ? "B" : "A"}`}>เริ่มสร้างโปรไฟล์</Button>
      <Button href="/join/showcase" variant="text">ดูตัวอย่างแอปที่ลูกค้าเห็น</Button>
    </>
  );

  return (
    <Shell header={<BrandHeader tone="bar" />} footer={false}>
      <Container className="pt-5 md:pt-8">
        <Button href="/join" variant="text" block={false} className="!px-0 -ml-0.5"><Icon d="m15 18-6-6 6-6" /> กลับหน้ารับสมัคร</Button>
        <div className="mt-2 mb-5 md:mb-8">
          <div className="text-[13px] font-light text-mb-gold">รายได้และส่วนแบ่ง</div>
          <h1 className="mb-h text-[26px] md:text-[34px] leading-[1.3]">คุณจะได้เท่าไหร่ต่อเดือน</h1>
          <p className="mb-s mt-1.5 mb-0 md:text-[15px]">เลือก 3 ข้อด้านล่าง ตัวเลขเปลี่ยนทันที</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8 lg:items-start">
          <div className="flex flex-col gap-4 min-w-0">
            <Card className="flex flex-col gap-5 md:p-6">
              <div><Step n={1}>สายงาน</Step><Seg label="สายงาน" items={(["eat", "massage"] as EarnSvc[]).map((k) => [k, SVC_LABEL[k]] as [EarnSvc, string])} value={svc} onChange={setSvc} /></div>
              <div><Step n={2}>ระดับ <span className="font-light text-[12.5px] text-[#b5a596]">(เริ่มต้น Silver · แอดมินปรับหลังอบรม)</span></Step><Seg label="ระดับ" items={LEVELS} value={tier} onChange={setTier} /></div>
              <div><Step n={3}>จำนวนเคสต่อเดือน</Step><Seg label="จำนวนเคสต่อเดือน" items={EARNINGS.caseOptions.map((c) => [c, String(c)] as [number, string])} value={cases} onChange={setCases} /></div>
            </Card>

            {/* ผลลัพธ์ (มือถือแสดงตรงนี้ · lg ย้ายไปแผงขวา) */}
            <Result className="lg:hidden" monthly={monthly} cases={cases} price={price} pct={pct} perCase={perCase} />

            {/* ส่วนแบ่ง 3 ขั้น — ขั้นที่ตรงกับจำนวนเคสที่เลือกเป็นสีทอง */}
            <Card className="md:p-6">
              <div className="font-semibold text-[16px] mb-1">แบ่งรายได้ระหว่างคุณกับแพลตฟอร์ม</div>
              <p className="mb-xs m-0 mb-3">ยิ่งทำเคสมากในเดือน ส่วนแบ่งของคุณยิ่งสูง (คิดทั้งเดือน)</p>
              <div data-share-tiers className="grid gap-2.5 sm:grid-cols-3">
                {cfg.tiers.map((t, i) => {
                  const on = i === activeIdx;
                  return (
                    <div key={t.min} data-on={on ? "1" : "0"} className="rounded-2xl p-3.5 flex sm:flex-col gap-3 sm:gap-2.5 items-center sm:items-stretch transition"
                      style={{ background: on ? "linear-gradient(150deg,#3d2c16,#241c17)" : "#1d1715", border: `1.5px solid ${on ? GOLD : "rgba(243,234,217,.07)"}` }}>
                      <div className="flex-1 sm:flex-none min-w-0">
                        <div className="text-[13px] font-semibold" style={{ color: on ? GOLD : "#d9c9b4" }}>{rangeOf(t)}<span className="font-light">/เดือน</span></div>
                        <div className="flex items-baseline gap-1.5"><b className="text-[24px] leading-tight [font-variant-numeric:tabular-nums]" style={{ color: on ? "#fff1c9" : "#f3ead9" }}>{t.pct}%</b><span className="text-[12.5px] text-[#d9c9b4]">คุณได้</span></div>
                      </div>
                      <div className="w-[42%] sm:w-full flex flex-col gap-1">
                        <div className="h-2 rounded-full overflow-hidden flex" style={{ background: "rgba(243,234,217,.10)" }}><span style={{ width: `${t.pct}%`, background: on ? GOLD : "#a8875a" }} /></div>
                        <div className="text-[11.5px] text-[#b5a596]">แพลตฟอร์ม {100 - t.pct}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mb-xs m-0 mt-3">ส่วนของแพลตฟอร์มใช้เป็นค่าระบบ การตลาด ประกัน และทีมดูแลความปลอดภัย</p>
            </Card>

            <Card className="md:p-6">
              <div className="font-semibold text-[16px] mb-3">ราคาต่อเคส 3 ชม. (ลูกค้าจ่าย)</div>
              <div className="rounded-xl overflow-hidden text-[14px]" style={{ border: "1px solid rgba(243,234,217,.07)" }}>
                <div className="grid px-3.5 py-2 text-[12.5px] text-[#b5a596]" style={{ gridTemplateColumns: "1.5fr 1fr 1fr", background: "#171211" }}><span>สายงาน</span><span className="text-right">Silver</span><span className="text-right">TOP</span></div>
                {(["eat", "massage"] as EarnSvc[]).map((k) => (
                  <div key={k} className="grid px-3.5 py-2.5 border-t border-[rgba(243,234,217,.07)] [font-variant-numeric:tabular-nums]" style={{ gridTemplateColumns: "1.5fr 1fr 1fr", background: svc === k ? "rgba(232,196,114,.06)" : undefined }}>
                    <span>{SVC_LABEL[k]}</span>
                    <span className="text-right" style={svc === k && tier === "silver" ? { color: GOLD, fontWeight: 700 } : undefined}>{baht(cfg.price3h[k].silver)}</span>
                    <span className="text-right" style={svc === k && tier === "top" ? { color: GOLD, fontWeight: 700 } : undefined}>{baht(cfg.price3h[k].top)}</span>
                  </div>
                ))}
              </div>
              <div className="mb-xs mt-2.5">{`5 ชม. = ราคา ×${cfg.fiveHourMultiplier} · ทิปจากลูกค้าได้เต็ม ${cfg.tipPct}%`}</div>
            </Card>

            <Card className="md:p-6">
              <div className="font-semibold text-[16px] mb-3">ได้เงินเมื่อไร</div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {([
                  ["M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", "ลูกค้าจ่ายเข้าระบบก่อนนัด เงินพักไว้กับเรา"],
                  ["M20 6 9 17l-5-5", `จบนัดแล้วโอนส่วนของคุณ${cfg.payout}`],
                  ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", cfg.noShow.includes("เต็ม") ? "ลูกค้าไม่มาตามนัด คุณยังได้ส่วนของคุณเต็ม" : `ลูกค้าไม่มาตามนัด: ${cfg.noShow}`],
                  ["M3 3v18h18M7 14l4-4 4 4 5-5", "ดูรายได้และถอนเงินในแอปได้ทุกวัน"],
                ] as [string, string][]).map(([d, t]) => (
                  <div key={t} className="flex gap-3 items-start rounded-xl p-3" style={{ background: "#1d1715" }}>
                    <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: "rgba(232,196,114,.14)", color: GOLD }}><Icon d={d} size={17} /></span>
                    <span className="text-[14px] leading-[1.5] text-[#e6d6c4]">{t}</span>
                  </div>
                ))}
              </div>
            </Card>
            <p className="mb-xs m-0">ตัวเลขเป็นการประมาณ ขึ้นกับจำนวนเคสจริงและระดับที่ได้รับ · ราคาและส่วนแบ่งตามประกาศล่าสุดของแพลตฟอร์ม</p>
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
    <section aria-live="polite" data-earn-result className={`rounded-[20px] p-[18px] md:p-6 flex flex-col gap-3 ${className}`}
      style={{ background: "radial-gradient(120% 120% at 0% 0%, rgba(232,196,114,.20), transparent 55%), linear-gradient(150deg,#3a2a17,#211a18 70%)", border: "1px solid rgba(232,196,114,.4)" }}>
      <div className="text-[13px] text-[#e6d6c4]">รายได้โดยประมาณต่อเดือน</div>
      <div className="mb-h text-[40px] md:text-[46px] text-mb-gold [font-variant-numeric:tabular-nums]" style={{ lineHeight: 1.25 }}>{baht(monthly)}</div>
      <div className="text-[13.5px] text-[#d9c9b4]">{`${cases} เคส × ${baht(price)} × ส่วนแบ่ง ${pct}%`}</div>
      <div className="flex flex-col gap-1.5">
        <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "rgba(243,234,217,.10)" }}>
          <span style={{ width: `${pct}%`, background: "linear-gradient(90deg,#f0d38a,#e2b75a)", transition: "width .35s ease" }} />
        </div>
        <div className="flex justify-between text-[12px]"><span style={{ color: GOLD }}>คุณ {pct}%</span><span className="text-[#b5a596]">แพลตฟอร์ม {100 - pct}%</span></div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="rounded-xl px-3 py-2" style={{ background: "rgba(0,0,0,.25)" }}><div className="text-[11.5px] text-[#b5a596]">คุณได้ต่อเคส</div><b className="text-[16px] text-[#f3ead9] [font-variant-numeric:tabular-nums]">{baht(perCase)}</b></div>
        <div className="rounded-xl px-3 py-2" style={{ background: "rgba(0,0,0,.25)" }}><div className="text-[11.5px] text-[#b5a596]">ลูกค้าจ่ายต่อเคส</div><b className="text-[16px] text-[#f3ead9] [font-variant-numeric:tabular-nums]">{baht(price)}</b></div>
      </div>
    </section>
  );
}
