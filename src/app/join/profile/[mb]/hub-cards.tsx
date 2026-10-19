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
