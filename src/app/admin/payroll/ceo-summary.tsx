"use client";

import { useMemo, useState } from "react";
import type { PersonRow, PersonType } from "@/lib/admin/ceo-room";
import type { IncomeRow, IncomeSystem } from "@/lib/admin/income";

const INK = "#2a1d1a", MUTED = "#8a7b75", BD = "#ebe2d5";
const satang = (s: number) => "฿" + (s / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const bahtN = (n: number) => "฿" + n.toLocaleString("th-TH");
const SYS: Record<IncomeSystem, string> = { parttime: "Part-Time", partner: "Partner", collab: "Collab", market: "ร้านค้า", customer: "ลูกค้า" };
type Range = "today" | "7d" | "month" | "all";
const RANGES: [Range, string][] = [["today", "วันนี้"], ["7d", "7 วัน"], ["month", "เดือนนี้"], ["all", "ทั้งหมด"]];
const since = (r: Range) => {
  if (r === "all") return "";
  if (r === "7d") return new Date(Date.now() - 7 * 86400e3).toISOString();
  const n = new Date(Date.now() + 7 * 3600e3);
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), r === "today" ? n.getUTCDate() : 1) - 7 * 3600e3).toISOString();
};
const TABS: [PersonType, string][] = [["parttime", "Part-Time"], ["sales", "Recruit"], ["partner", "Partner สปา · โรงแรม"], ["vendor", "ร้านค้า"]];

type Totals = { waiting: number; waitingN: number; requested: number; requestedN: number; approved: number; available: number };

// ห้อง CEO ส่วนบน: เงินเข้าบริษัท · ยอดรอ CEO · คำขอถอน · รายคน (ใช้ทั้งหน้า CEO และหน้าแอดมินดูอย่างเดียว)
export function CeoSummary({ income, totals, people }: { income: Pick<IncomeRow, "at" | "system" | "status" | "amount">[]; totals: Totals; people: PersonRow[] }) {
  const [range, setRange] = useState<Range>("month");
  const [tab, setTab] = useState<PersonType>("parttime");
  const from = since(range);
  const inc = useMemo(() => income.filter((r) => r.status === "in" && (!from || r.at >= from)), [income, from]);
  const incSum = inc.reduce((a, r) => a + r.amount, 0);
  const bySys = (Object.keys(SYS) as IncomeSystem[]).map((s) => [s, inc.filter((r) => r.system === s).reduce((a, r) => a + r.amount, 0)] as const).filter(([, v]) => v);
  const list = people.filter((p) => p.type === tab);
  const card = "rounded-[18px] bg-white px-4 py-3.5 flex flex-col gap-0.5 shadow-[0_4px_18px_rgba(90,60,20,.05)]";
  return (
    <div data-ceo-summary className="flex flex-col gap-4 mb-6" style={{ color: INK }}>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="ช่วงเวลาเงินเข้า">
        {RANGES.map(([k, l]) => <button key={k} role="tab" aria-selected={range === k} onClick={() => setRange(k)} className="h-9 px-3.5 rounded-full border text-[13px] font-semibold"
          style={range === k ? { background: INK, borderColor: INK, color: "#fff" } : { background: "#fff", borderColor: "#e7ddcf", color: "#5c4f48" }}>{l}</button>)}
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <div data-ceo-card="income" className={`${card} col-span-2 xl:col-span-1`} style={{ background: "#2a1d1a", color: "#fff" }}>
          <span className="text-[12.5px] text-[#e8c472]">เงินเข้าบริษัท · {RANGES.find(([k]) => k === range)?.[1]}</span>
          <b className="text-[26px] tabular-nums leading-tight">{bahtN(incSum)}</b>
          <span className="text-[12px] text-[#d9cbbf]">{bySys.length ? bySys.map(([s, v]) => `${SYS[s]} ${bahtN(v)}`).join(" · ") : "ยังไม่มีเงินเข้าในช่วงนี้"}</span>
        </div>
        <div data-ceo-card="waiting" className={card}><span className="text-[12.5px]" style={{ color: MUTED }}>รอ CEO อนุมัติเข้ากระเป๋า</span><b className="text-[22px] tabular-nums" style={{ color: totals.waiting ? "#a8781f" : INK }}>{satang(totals.waiting)}</b><span className="text-[12px]" style={{ color: MUTED }}>{totals.waitingN} คน</span></div>
        <div data-ceo-card="requested" className={card}><span className="text-[12.5px]" style={{ color: MUTED }}>คำขอถอน รอ CEO</span><b className="text-[22px] tabular-nums" style={{ color: totals.requested ? "#b42335" : INK }}>{satang(totals.requested)}</b><span className="text-[12px]" style={{ color: MUTED }}>{totals.requestedN} รายการ</span></div>
        <div data-ceo-card="approved" className={card}><span className="text-[12.5px]" style={{ color: MUTED }}>อนุมัติแล้ว รอแอดมินโอน</span><b className="text-[22px] tabular-nums">{satang(totals.approved)}</b><span className="text-[12px]" style={{ color: MUTED }}>หน้า "โอนเงินออก"</span></div>
        <div data-ceo-card="available" className={card}><span className="text-[12.5px]" style={{ color: MUTED }}>เงินในกระเป๋าทุกคนรวม</span><b className="text-[22px] tabular-nums" style={{ color: "#2f7a46" }}>{satang(totals.available)}</b><span className="text-[12px]" style={{ color: MUTED }}>ถอนได้ / ใช้ได้</span></div>
      </div>

      <section data-ceo-people className="rounded-[20px] bg-white overflow-hidden shadow-[0_4px_18px_rgba(90,60,20,.05)]">
        <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-3">
          <b className="text-[17px] mr-2">เงินแต่ละคน</b>
          {TABS.map(([k, l]) => { const n = people.filter((p) => p.type === k).length; return (
            <button key={k} data-ceo-people-tab={k} onClick={() => setTab(k)} aria-pressed={tab === k} className="h-8 px-3 rounded-full border text-[12.5px] font-semibold"
              style={tab === k ? { background: INK, borderColor: INK, color: "#fff" } : { background: "#fff", borderColor: "#e7ddcf", color: "#5c4f48" }}>{l} <span className="opacity-70">{n}</span></button>); })}
          <a href="/admin/wallets" className="ml-auto text-[13px] text-[#8a6516] hover:underline">ดูประวัติรายการในกระเป๋า →</a>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))] gap-2 px-5 py-2 text-[12px] border-y" style={{ borderColor: BD, color: MUTED }}>
              <span>ชื่อ</span><span className="text-right">รอ CEO เข้ากระเป๋า</span><span className="text-right">ในกระเป๋า</span><span className="text-right">ขอถอน (รอ CEO)</span><span className="text-right">อนุมัติแล้วรอโอน</span><span className="text-right">ถอนสำเร็จรวม</span>
            </div>
            {!list.length && <p className="m-0 p-8 text-center" style={{ color: MUTED }}>ยังไม่มียอดเงินในส่วนนี้</p>}
            {list.map((r) => (
              <div key={r.key} data-ceo-person={r.type} className="grid grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))] gap-2 px-5 py-2.5 items-center border-b last:border-b-0 text-[14px] tabular-nums" style={{ borderColor: BD }}>
                <span className="min-w-0"><b className="font-semibold">{r.name}</b><span className="block text-[12px] truncate" style={{ color: MUTED }}>{r.sub}</span></span>
                <span className="text-right" style={{ color: r.waiting ? "#a8781f" : MUTED }}>{r.waiting ? satang(r.waiting) : "—"}</span>
                <span className="text-right" style={{ color: r.available ? "#2f7a46" : MUTED }}>{r.available ? satang(r.available) : "—"}</span>
                <span className="text-right" style={{ color: r.requested ? "#b42335" : MUTED }}>{r.requested ? satang(r.requested) : "—"}</span>
                <span className="text-right" style={{ color: r.approved ? INK : MUTED }}>{r.approved ? satang(r.approved) : "—"}</span>
                <span className="text-right" style={{ color: r.paid ? INK : MUTED }}>{r.paid ? satang(r.paid) : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
