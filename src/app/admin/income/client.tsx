"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { IncomeRow, IncomeStatus, IncomeSystem } from "@/lib/admin/income";
import { csvCell } from "@/lib/csv";

const GOLD = "#f0c75a";
const LINE = "rgba(240,200,90,.38)";
const LABEL: Record<IncomeSystem, string> = { parttime: "Part-Time", partner: "Partner สปา · โรงแรม", collab: "Collab · MB x Bars", market: "ร้านค้า Marketplace", customer: "ลูกค้า" };
const COLOR: Record<IncomeSystem, string> = { parttime: "#e8c472", partner: "#2f7a46", collab: "#5b3fb0", market: "#c0577e", customer: "#2563a8" };
const ST: Record<IncomeStatus, [string, string]> = { in: ["เข้าแล้ว", "#2f7a46"], pending: ["รอตรวจ", "#eed58a"], rejected: ["ไม่ผ่าน", "#b42335"], refunded: ["คืนเงินแล้ว", "#8a7b75"] };
const SYSTEMS: IncomeSystem[] = ["parttime", "partner", "collab", "market", "customer"];
const baht = (n: number) => "฿" + n.toLocaleString("th-TH");
const dt = (iso: string) => new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
type Range = "today" | "7d" | "month" | "all";
const RANGES: [Range, string][] = [["today", "วันนี้"], ["7d", "7 วัน"], ["month", "เดือนนี้"], ["all", "ทั้งหมด"]];
const since = (r: Range) => {
  const now = new Date(Date.now() + 7 * 3600e3); // เวลาไทย
  if (r === "all") return "";
  if (r === "7d") return new Date(Date.now() - 7 * 86400e3).toISOString();
  const y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
  return new Date(Date.UTC(y, m, r === "today" ? d : 1) - 7 * 3600e3).toISOString();
};

export function IncomeBoard({ rows }: { rows: IncomeRow[] }) {
  const router = useRouter();
  const [sys, setSys] = useState<IncomeSystem | "all">("all");
  const [st, setSt] = useState<IncomeStatus | "all">("all");
  const [range, setRange] = useState<Range>("month");
  const [q, setQ] = useState("");
  const from = since(range);
  const inRange = useMemo(() => rows.filter((r) => !from || r.at >= from), [rows, from]);
  const t = q.trim().toLowerCase();
  const shown = inRange.filter((r) => (sys === "all" || r.system === sys) && (st === "all" || r.status === st) && (!t || `${r.who} ${r.sender ?? ""} ${r.kind}`.toLowerCase().includes(t)));
  const sumIn = (s?: IncomeSystem) => inRange.filter((r) => r.status === "in" && (!s || r.system === s)).reduce((a, r) => a + r.amount, 0);
  const pending = inRange.filter((r) => r.status === "pending");
  const exportCsv = () => {
    const head = ["เวลา", "ระบบ", "รายการ", "ผู้โอน (ในระบบ)", "ชื่อบนสลิป", "ยอด (บาท)", "สถานะ"];
    const body = shown.map((r) => [dt(r.at), LABEL[r.system], r.kind, r.who, r.sender ?? "", String(r.amount), ST[r.status][0]].map((v) => csvCell(v)).join(","));
    const blob = new Blob(["﻿" + [head.map((v) => csvCell(v)).join(","), ...body].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `ยอดเงินเข้า-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };
  const chip = (on: boolean, color = GOLD) => ({ borderColor: on ? color : LINE, background: on ? color : "transparent", color: on ? "#1a1206" : "#5c4f48" });
  return (
    <div className="flex flex-col gap-4 text-[13.5px]">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="ช่วงเวลา">
        {RANGES.map(([k, l]) => <button key={k} role="tab" aria-selected={range === k} onClick={() => setRange(k)} className="h-9 px-3.5 rounded-full border text-[12.5px] font-semibold" style={chip(range === k)}>{l}</button>)}
      </div>

      {/* สรุปยอดเข้าแล้วตามระบบ (กดเพื่อกรอง) */}
      <div data-income-summary className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        <button type="button" onClick={() => setSys("all")} className="rounded-2xl border px-3.5 py-3 text-left" style={{ borderColor: sys === "all" ? GOLD : LINE, background: sys === "all" ? "rgba(240,200,90,.12)" : "#ffffff" }}>
          <div className="text-[11.5px] text-[#cdbfb3]">เงินเข้าแล้ว · ทุกระบบ</div><div className="font-lux font-bold text-xl text-[#ffd76a]">{baht(sumIn())}</div><div className="text-[11.5px] text-[#9a8a85]">รอตรวจ {pending.length} รายการ · {baht(pending.reduce((a, r) => a + r.amount, 0))}</div>
        </button>
        {SYSTEMS.map((s) => (
          <button key={s} type="button" data-income-system={s} onClick={() => setSys(s)} className="rounded-2xl border px-3.5 py-3 text-left" style={{ borderColor: sys === s ? COLOR[s] : LINE, background: sys === s ? "rgba(255,255,255,.05)" : "#ffffff" }}>
            <div className="text-[11.5px]" style={{ color: COLOR[s] }}>{LABEL[s]}</div><div className="font-lux font-bold text-xl">{baht(sumIn(s))}</div>
            <div className="text-[11.5px] text-[#9a8a85]">{s === "collab" ? "ยังไม่เปิดระบบ" : `${inRange.filter((r) => r.system === s && r.status === "in").length} รายการ`}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {([["all", "ทุกสถานะ"], ["in", "เข้าแล้ว"], ["pending", "รอตรวจ"], ["rejected", "ไม่ผ่าน"], ["refunded", "คืนเงินแล้ว"]] as const).map(([k, l]) => <button key={k} onClick={() => setSt(k)} className="h-9 px-3 rounded-full border text-[12.5px] font-semibold" style={chip(st === k)}>{l}</button>)}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อผู้โอน · รหัส · เลขออเดอร์" aria-label="ค้นหา" className="h-9 w-64 max-w-full rounded-full border bg-[#130e0e] px-4 text-[13px] text-[#f6efe4] outline-none" style={{ borderColor: LINE }} />
        <button type="button" onClick={exportCsv} className="h-9 px-4 rounded-full border text-[#d3c7bc]" style={{ borderColor: LINE }}>ส่งออก CSV</button>
      </div>

      <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: LINE }}>
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[120px_150px_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_100px_90px_80px] gap-2 px-3.5 py-2.5 bg-[#130e0e] text-[#9a8a85] text-xs"><span>เวลา</span><span>ระบบ</span><span>รายการ</span><span>ผู้โอน (ในระบบ)</span><span>ชื่อบนสลิป</span><span className="text-right">ยอด</span><span>สถานะ</span><span>สลิป</span></div>
          {!shown.length && <p className="m-0 p-5 text-center text-[#9a8a85]">ไม่มีรายการในช่วงนี้</p>}
          {shown.map((r) => (
            <div key={r.id} role="link" tabIndex={0} onClick={() => router.push(r.href)} onKeyDown={(e) => { if (e.key === "Enter") router.push(r.href); }} data-income-row={r.system} title="กดเพื่อไปที่รายการนี้" className="grid grid-cols-[120px_150px_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_100px_90px_80px] gap-2 px-3.5 py-2.5 border-t items-center text-inherit hover:bg-[rgba(240,200,90,.05)] cursor-pointer" style={{ borderColor: LINE }}>
              <span className="text-[12.5px] text-[#cdbfb3]">{dt(r.at)}</span>
              <span className="font-semibold" style={{ color: COLOR[r.system] }}>{LABEL[r.system]}</span>
              <span className="truncate">{r.kind}</span>
              <span className="truncate">{r.who}</span>
              <span className="truncate text-[#cdbfb3]">{r.sender ?? "—"}</span>
              <span className="text-right font-semibold tabular-nums">{baht(r.amount)}</span>
              <span style={{ color: ST[r.status][1] }}>{ST[r.status][0]}</span>
              <span>{r.slip ? <a data-income-slip href={r.slip} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center h-7 px-2.5 rounded-full text-[12px] font-semibold" style={{ background: "#f6ecd2", color: "#8a6516" }}>ดูสลิป</a> : <span className="text-[#9a8a85]">—</span>}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="m-0 text-[12px] text-[#9a8a85]">นับเฉพาะเงินที่โอนเข้าบริษัทจริง (QR + สลิป) · ชื่อบนสลิปมาจาก Slip2Go · กดแถวเพื่อไปที่รายการนั้น (ค่าสมัคร → ผู้สมัครคนนั้น) · กด “ดูสลิป” เพื่อเปิดรูปสลิป</p>
    </div>
  );
}
