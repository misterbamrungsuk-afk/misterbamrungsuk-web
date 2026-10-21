"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// เงินประกันงาน (สายคำเชิญพิเศษ) — หักเคสละ ฿500 · ก้อนที่ครบ 90 วันกดย้ายเข้ายอดถอนได้ · ถอนเสียค่าธรรมเนียม 3% ตามปกติ
const baht = (s: number) => "฿" + Math.round(s / 100).toLocaleString("en-US");
const th = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

export function BondCard({ mb, t, s, perJob, lockDays }: { mb: string; t: string; s: { balance: number; matured: number; locked: number; next: { at: string; amount: number } | null; jobs: number }; perJob: number; lockDays: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const release = async () => {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/pt/bond", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setBusy(false);
    setMsg(j?.ok ? { ok: true, text: `ย้าย ${baht(j.moved)} เข้ายอดถอนได้แล้ว` } : { ok: false, text: j?.error || "ทำรายการไม่สำเร็จ" });
    if (j?.ok) router.refresh();
  };
  return (
    <section data-bond-card className="rounded-[20px] flex flex-col gap-2.5" style={{ padding: 16, background: "#211a18", boxShadow: "inset 0 0 0 1px rgba(232,196,114,.3)" }}>
      <div className="flex justify-between items-baseline gap-2"><span className="font-semibold text-[16px] text-[#e8c472]">เงินประกันงาน</span><b className="text-[22px] tabular-nums">{baht(s.balance)}</b></div>
      <p className="m-0 text-[12.5px] font-light text-[#d9c9b4] leading-[1.6]">สายคำเชิญพิเศษ: หักเคสละ {baht(perJob)} จากรายได้ เก็บไว้กันหนีงาน/เทงานกะทันหัน · เงินแต่ละก้อนครบ {lockDays} วันย้ายเข้ายอดถอนได้ (ถอนเสียค่าธรรมเนียม 3% ตามปกติ)</p>
      <div className="grid grid-cols-2 gap-2 text-[13px]">
        <div className="rounded-xl" style={{ padding: "8px 10px", background: "rgba(127,214,163,.1)" }}><div className="font-light text-[#d9c9b4]">ครบ {lockDays} วันแล้ว</div><b className="text-[16px] text-[#7fd6a3] tabular-nums">{baht(s.matured)}</b></div>
        <div className="rounded-xl" style={{ padding: "8px 10px", background: "rgba(243,234,217,.06)" }}><div className="font-light text-[#d9c9b4]">ยังไม่ครบ</div><b className="text-[16px] tabular-nums">{baht(s.locked)}</b></div>
      </div>
      {s.next && <div className="text-[12.5px] font-light text-[#d9c9b4]">ก้อนถัดไป {baht(s.next.amount)} ครบวันที่ {th(s.next.at)}</div>}
      <button type="button" disabled={busy || s.matured <= 0} onClick={release} className="min-h-11 rounded-xl text-[14px] font-semibold bg-[#e8c472] text-[#1b130b] disabled:opacity-40">{busy ? "กำลังย้าย…" : s.matured > 0 ? `ย้าย ${baht(s.matured)} เข้ายอดถอนได้` : `ยังไม่มีก้อนที่ครบ ${lockDays} วัน`}</button>
      {msg && <p role="status" className="m-0 text-[13px]" style={{ color: msg.ok ? "#7fd6a3" : "#ff8a9a" }}>{msg.text}</p>}
    </section>
  );
}
