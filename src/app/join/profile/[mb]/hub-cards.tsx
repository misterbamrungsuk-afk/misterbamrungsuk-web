"use client";

// การ์ดบนหน้าหลัก Part-Time: "ประมาณรายได้" (ตัวเลขชุดเดียวกับ /join/earnings · ราคา/ส่วนแบ่งจากแอดมิน) + "โปรโมชั่น" (ข้อเสนอที่มีจริงในระบบ)
import { useState } from "react";
import Link from "next/link";
import { pctFor } from "@/lib/join/earnings-shared";
import { GATE_MSG, GATE_SHORT } from "@/lib/join/pt-ui";
import type { HubData } from "./client";
import { SaveLink } from "@/components/save-link";

const GOLD = "#e8c472";
const baht = (n: number) => "฿" + Math.round(n).toLocaleString("en-US");
const CASES = [5, 10, 15, 20, 25];

/** ประมาณรายได้ต่อเดือน = จำนวนนัด × ราคา 3 ชม. ตามระดับ × ส่วนแบ่งตามจำนวนนัด */
export function EstimateCard({ d, q }: { d: HubData; q: string }) {
  const [n, setN] = useState(10);
  if (!d.estimate.show || !d.estimate.tiers.length) return null;
  const pct = pctFor(d.estimate.tiers, n);
  const per = Math.round((d.price * pct) / 100);
  return (
    <section aria-labelledby="est-h" className="flex flex-col gap-3 rounded-[18px] bg-[#211a18]" style={{ padding: 16 }}>
      <div className="flex justify-between items-center gap-2">
        <h2 id="est-h" className="m-0 text-[15px] font-semibold text-[#e8c472]">ประมาณรายได้</h2>
        <Link href={`/join/profile/${d.mb}/earnings${q}`} className="min-h-10 inline-flex items-center text-[13px] text-[#e8c472] font-light hover:text-[#e8c472]">ตารางส่วนแบ่ง ›</Link>
      </div>
      <div className="text-[13px] font-light text-[#d9c9b4]">ถ้ารับงานเดือนละกี่นัด? ({d.trackShort} · ระดับ {d.tier === "top" ? "TOP" : "Silver"} · {baht(d.price)} / 3 ชม.)</div>
      <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="จำนวนนัดต่อเดือน">
        {CASES.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={n === c} onClick={() => setN(c)} className="min-h-11 rounded-xl text-[14px] font-semibold" style={{ background: n === c ? GOLD : "rgba(243,234,217,0.07)", color: n === c ? "#1b130b" : "#f3ead9" }}>{c}</button>
        ))}
      </div>
      <div className="flex justify-between items-end gap-3">
        <div className="min-w-0"><div className="text-[13px] font-light">ประมาณ / เดือน</div><div className="font-bold text-[28px] leading-[1.15] text-[#e8c472] tabular-nums">{baht(per * n)}</div></div>
        <div className="text-right text-[12.5px] font-light text-[#d9c9b4] leading-[1.5]">{n} นัด × {baht(per)}<br />ส่วนแบ่ง {pct}%</div>
      </div>
      <div className="text-[12px] font-light text-[#b5a596] leading-[1.5]">ไม่รวมทิป (ได้ {d.estimate.tipPct}%) · นัด 5 ชม. ได้มากขึ้น · โอน{d.estimate.payout.replace(/^โอน/, "")} · เป็นตัวเลขประมาณ ไม่ใช่การรับประกันรายได้</div>
    </section>
  );
}

/** โปรโมชั่นที่ Part-Time ใช้ได้ (ค่าจริงจากระบบ) · ยังไม่อนุมัติ = เห็นข้อเสนอ + ข้อความรออนุมัติ (กดใช้ไม่ได้) */
export function PromoCard({ d, q, onBoost }: { d: HubData; q: string; onBoost: () => void }) {
  const m = d.promos.member;
  const row = "flex items-center gap-3 rounded-xl text-left text-[#f3ead9] hover:text-[#f3ead9] w-full";
  const st = { padding: "10px 12px", background: "rgba(232,196,114,0.10)" };
  const boostInner = (
    <>
      <span aria-hidden="true" className="text-[18px] text-[#e8c472]">★</span>
      <span className="flex-1 min-w-0 leading-[1.4]"><b className="block text-[14px]">โปรโมทโปรไฟล์ ขึ้นหน้าแนะนำ</b><span className="text-[12.5px] font-light text-[#d9c9b4]">{d.promos.boost.map((p) => `${p.days} วัน ${baht(p.price)}`).join(" · ")}</span></span>
      {d.active && <span className="text-[#e8c472]">›</span>}
    </>
  );
  const memberInner = m && (
    <>
      <span aria-hidden="true" className="text-[18px]">🤝</span>
      <span className="flex-1 min-w-0 leading-[1.4]"><b className="block text-[14px]">ชวนลูกค้าเปิดเมม รับค่าคอม</b><span className="text-[12.5px] font-light text-[#d9c9b4]">{m.gold.name} {baht(m.gold.commission)} · {m.black.name} {baht(m.black.commission)} ต่อคน · หรือแปลงเป็นวงเงินโปรโมท ×{m.mult} ({m.gold.name} 1 คน = {baht(m.gold.commission * m.mult)})</span></span>
      {d.active && <span className="text-[#e8c472]">›</span>}
    </>
  );
  return (
    <section aria-labelledby="promo-h" className="flex flex-col gap-2.5 rounded-[18px]" style={{ padding: 16, background: "linear-gradient(150deg, #2c1a1f 0%, #211a18 75%)", boxShadow: "inset 0 0 0 1px rgba(232,196,114,.25)" }}>
      <h2 id="promo-h" className="m-0 text-[15px] font-semibold text-[#e8c472]">โปรโมชั่น</h2>
      {d.promos.boost.length > 0 && (d.active
        ? <button type="button" onClick={onBoost} className={row + " min-h-12"} style={st}>{boostInner}</button>
        : <div className={row} style={st}>{boostInner}</div>)}
      {memberInner && (d.active
        ? <Link href={`/join/profile/${d.mb}/sales${q}`} className={row + " min-h-12"} style={st}>{memberInner}</Link>
        : <div className={row} style={st}>{memberInner}</div>)}
      {!d.active && <p className="m-0 text-[12.5px] font-light text-[#f6c38e] leading-[1.5]">{GATE_SHORT} · {GATE_MSG}</p>}
    </section>
  );
}

/** บันทึกลิงก์เข้าโปรไฟล์ — LINE กับ Chrome/Safari คุกกี้แยกกัน · เก็บลิงก์ไว้เข้าจากเครื่องอื่นได้เอง ไม่ต้องทักแอดมิน */
export function SaveLinkCard({ d }: { d: HubData }) {
  return (
    <section aria-label="บันทึกลิงก์เข้าโปรไฟล์" className="rounded-[18px] bg-[#211a18]" style={{ padding: 16 }}>
      <SaveLink mb={d.mb} t={d.t} />
    </section>
  );
}

/** เงินประกัน (สายการันตี) — หลอดนับ 1 ปีจากวันอบรมผ่าน + ขั้นที่ต้องผ่านก่อนได้คืน (เงื่อนไขเดียวกับ GUARANTEE_REFUND_NOTE) */
export function GuaranteeCard({ g }: { g: NonNullable<HubData["guarantee"]> }) {
  const DAY = 86400_000, YEAR = 365;
  const thDate = (ms: number) => new Date(ms).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
  const start = g.trainedAt ? Date.parse(g.trainedAt) : null;
  const due = start !== null ? start + YEAR * DAY : null;
  const days = start !== null ? Math.min(YEAR, Math.max(0, Math.floor((Date.now() - start) / DAY))) : 0;
  const pct = Math.round((days / YEAR) * 100);
  const yearDone = start !== null && days >= YEAR;
  const clean = g.strikes === 0;
  const steps: { t: string; sub: string; ok: boolean }[] = [
    { t: "ชำระเงินประกัน", sub: g.paid ? `${baht(g.amount)} · ทีมงานตรวจสลิปแล้ว` : "ส่งสลิปแล้ว · รอทีมงานตรวจ", ok: g.paid },
    { t: "ยืนยันตัวตน + บัญชีรับเงิน", sub: g.kyc && g.bank ? "ผ่านแล้ว · ใช้บัญชีนี้รับเงินคืน" : "รอทีมงานตรวจเอกสาร", ok: g.kyc && g.bank },
    { t: "อบรมผ่าน", sub: start !== null ? `ผ่านเมื่อ ${thDate(start)} · เริ่มนับ 1 ปี` : "เข้าอบรมรอบหลักครบ → เริ่มนับ 1 ปี", ok: start !== null },
    { t: "ทำงานครบ 1 ปี", sub: due !== null ? (yearDone ? "ครบแล้ว" : `อีก ${YEAR - days} วัน · ครบ ${thDate(due)}`) : "เริ่มนับหลังอบรมผ่าน", ok: yearDone },
    { t: "ไม่ผิดกฎบริษัท", sub: clean ? "ตอนนี้ไม่มีใบเตือน · เช่น ไม่ปฏิเสธการรับลูกค้า" : `มีใบเตือนที่มีผล ${g.strikes} / ${g.strikeLimit} · ทีมงานตรวจประวัติก่อนคืน`, ok: clean && yearDone },
    { t: "ได้รับเงินคืน", sub: `${baht(g.amount)} เต็มจำนวน · ทีมงานโอนเข้าบัญชีที่ยืนยันไว้`, ok: false },
  ];
  return (
    <section aria-labelledby="gua-h" data-guarantee-pct={pct} className="flex flex-col gap-3 rounded-[18px] bg-[#211a18]" style={{ padding: 16 }}>
      <div className="flex justify-between items-baseline gap-2">
        <h2 id="gua-h" className="m-0 text-[15px] font-semibold text-[#e8c472]">เงินประกันคืน</h2>
        <b className="text-[18px] tabular-nums">{baht(g.amount)}</b>
      </div>
      <div>
        <div className="flex justify-between text-[13px] font-light text-[#d9c9b4]"><span>{start !== null ? `ทำงานแล้ว ${days} / ${YEAR} วัน` : "ยังไม่เริ่มนับ"}</span><span className="tabular-nums">{pct}%</span></div>
        <div className="h-2.5 rounded-full mt-1.5 overflow-hidden" style={{ background: "rgba(243,234,217,0.08)" }} role="progressbar" aria-valuemin={0} aria-valuemax={YEAR} aria-valuenow={days} aria-label="นับวันถึงคืนเงินประกัน">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: GOLD, minWidth: pct ? 6 : 0 }} />
        </div>
        <div className="text-[13px] mt-1.5 leading-[1.5]">{due !== null ? <>คาดว่าได้คืน <b className="text-[#e8c472]">{thDate(due)}</b></> : <span className="font-light text-[#d9c9b4]">เริ่มนับ 1 ปีตั้งแต่วันที่อบรมผ่าน</span>}</div>
      </div>
      <ol className="m-0 p-0 list-none flex flex-col gap-2">
        {steps.map((s, i) => (
          <li key={s.t} className="flex gap-2.5 items-start">
            <span aria-hidden="true" className="shrink-0 w-6 h-6 rounded-full grid place-items-center text-[12px] font-semibold" style={{ background: s.ok ? GOLD : "rgba(243,234,217,0.08)", color: s.ok ? "#1b130b" : "#b5a596" }}>{s.ok ? "✓" : i + 1}</span>
            <span className="min-w-0 leading-[1.4]"><b className="block text-[14px] font-medium">{s.t}<span className="sr-only">{s.ok ? " (ผ่านแล้ว)" : " (ยังไม่ถึง)"}</span></b><span className="text-[12.5px] font-light text-[#d9c9b4]">{s.sub}</span></span>
          </li>
        ))}
      </ol>
      <p className="m-0 text-[12px] font-light text-[#b5a596] leading-[1.5]">คืนเต็มจำนวนเมื่อครบ 1 ปีและไม่ผิดกฎบริษัทและกฎหมาย เช่น ไม่ปฏิเสธการรับลูกค้าในวันเวลาที่แจ้งไว้</p>
    </section>
  );
}
