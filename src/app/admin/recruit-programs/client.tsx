"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProgramKey, Programs } from "@/lib/member/recruit-programs";

export type PtRow = { id: string; mb: string; name: string; rep: string; repId: string | null; repKind: string | null; status: string; free: boolean; paid: number; paidAt: string | null; bonus: number; at: string };

const KEYS: ProgramKey[] = ["parttime", "partner", "collab", "member"];
const TITLE: Record<ProgramKey, string> = { parttime: "หา Part-time", partner: "หา Partner", collab: "หา Collab", member: "หาลูกค้าเปิด Member" };
const UNIT: Record<ProgramKey, string> = { parttime: "คน", partner: "ร้าน", collab: "ราย", member: "คน" };
const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const dt = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit" });
const inp = "h-10 rounded-xl border px-3 bg-white text-[15px] outline-none focus:border-[#c9a24a] disabled:bg-[#f6f1ea] disabled:text-[#5c4f48]";

export function ProgramsAdmin({ isCeo, tab, programs, pt }: { isCeo: boolean; tab: ProgramKey; programs: Programs; pt: PtRow[] }) {
  const router = useRouter();
  const p = programs[tab];
  const [enabled, setEnabled] = useState(p.enabled);
  const [amount, setAmount] = useState(String(p.amount_satang / 100));
  const [note, setNote] = useState(p.note);
  const [bonus, setBonus] = useState(p.bonus.map((b) => ({ jobs: String(b.jobs), baht: String(b.satang / 100) })));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const save = async () => {
    setBusy(true); setMsg(null);
    const body = { [tab]: { enabled, amount_satang: Math.round(Number(amount || 0) * 100), note, bonus: bonus.filter((b) => b.jobs && b.baht).map((b) => ({ jobs: Number(b.jobs), satang: Math.round(Number(b.baht) * 100) })) } };
    const r = await fetch("/api/admin/recruit-programs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ programs: body }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    setBusy(false);
    setMsg(j?.ok ? { ok: true, t: `บันทึกราคา "${TITLE[tab]}" แล้ว · มีผลกับรายการใหม่ทันที` } : { ok: false, t: j?.error || "บันทึกไม่สำเร็จ" });
    if (j?.ok) router.refresh();
  };
  const total = pt.reduce((t, r) => t + r.paid + r.bonus, 0);
  return (
    <div className="flex flex-col gap-4">
      {/* แยกส่วน */}
      <div data-program-tabs className="flex flex-wrap gap-2">
        {KEYS.map((k) => {
          const on = k === tab;
          return (
            <Link key={k} href={`/admin/recruit-programs?p=${k}`} data-program-tab={k} className="h-10 px-4 rounded-full border text-[14px] font-semibold flex items-center gap-2"
              style={on ? { background: "#2a1d1a", color: "#fff", borderColor: "#2a1d1a" } : { background: "#fff", color: "#2a1d1a", borderColor: "#e7ddcf" }}>
              {TITLE[k]}
              <span className="text-[11px] rounded-full px-2 leading-[18px]" style={programs[k].enabled ? { background: "#e3f3e8", color: "#2f7a46" } : { background: "#f1ebe2", color: "#8a7b75" }}>{programs[k].enabled ? `เปิด · ${baht(programs[k].amount_satang)}` : "ยังไม่เปิด"}</span>
            </Link>
          );
        })}
      </div>

      {/* กำหนดราคา */}
      <section data-program-price={tab} key={tab} className="rounded-[20px] bg-white p-5 flex flex-col gap-3 shadow-[0_4px_18px_rgba(90,60,20,.05)]">
        <div className="flex flex-wrap items-center gap-3">
          <b className="text-[18px]">กำหนดราคา · {TITLE[tab]}</b>
          {!isCeo && <span className="text-[12.5px] rounded-full px-2.5 py-0.5" style={{ background: "#fbf1dc", color: "#8a6516" }}>ดูอย่างเดียว · แก้ได้เฉพาะ CEO</span>}
        </div>
        <label className="flex items-center gap-2.5 text-[15px] cursor-pointer w-fit">
          <input type="checkbox" data-program-enabled checked={enabled} disabled={!isCeo} onChange={(e) => setEnabled(e.target.checked)} className="w-5 h-5 accent-[#a8781f]" />
          เปิดส่วนนี้ให้ Recruit ใช้
        </label>
        <div className="grid sm:grid-cols-[220px_minmax(0,1fr)] gap-3">
          <label className="flex flex-col gap-1 text-[13px] text-[#5c4f48]">ค่าแนะนำ (บาท / {UNIT[tab]})
            <input data-program-amount inputMode="numeric" value={amount} disabled={!isCeo} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, "").slice(0, 9))} className={inp} style={{ borderColor: "#e7ddcf" }} /></label>
          <label className="flex flex-col gap-1 text-[13px] text-[#5c4f48]">เงื่อนไข (แสดงให้ Recruit เห็น)
            <input data-program-note value={note} disabled={!isCeo} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={tab === "parttime" ? "เช่น เงินเข้า Wallet เมื่อผู้สมัครได้งานแรก" : "ยังไม่มีเงื่อนไข"} className={inp} style={{ borderColor: "#e7ddcf" }} /></label>
        </div>
        {tab === "parttime" && (
          <div className="flex flex-col gap-2">
            <span className="text-[13px] text-[#5c4f48]">โบนัสรายเดือนต่อผู้สมัคร 1 คน (ขั้นสูงสุดที่ถึง · แทน ไม่บวกกัน · CEO อนุมัติต้นเดือน)</span>
            {bonus.map((b, i) => (
              <div key={i} data-program-bonus className="flex flex-wrap items-center gap-2 text-[14px]">
                ครบ <input inputMode="numeric" value={b.jobs} disabled={!isCeo} onChange={(e) => setBonus(bonus.map((x, j) => (j === i ? { ...x, jobs: e.target.value.replace(/\D/g, "").slice(0, 3) } : x)))} className={`${inp} w-20`} style={{ borderColor: "#e7ddcf" }} aria-label="จำนวนงาน" /> งาน / เดือน → ได้ ฿
                <input inputMode="numeric" value={b.baht} disabled={!isCeo} onChange={(e) => setBonus(bonus.map((x, j) => (j === i ? { ...x, baht: e.target.value.replace(/\D/g, "").slice(0, 6) } : x)))} className={`${inp} w-28`} style={{ borderColor: "#e7ddcf" }} aria-label="โบนัส (บาท)" />
                {isCeo && <button type="button" onClick={() => setBonus(bonus.filter((_, j) => j !== i))} className="h-9 px-3 rounded-lg text-[13px] text-[#b42335] border" style={{ borderColor: "#f3c2c9" }}>ลบขั้น</button>}
              </div>
            ))}
            {isCeo && bonus.length < 5 && <button type="button" onClick={() => setBonus([...bonus, { jobs: "", baht: "" }])} className="self-start h-9 px-3 rounded-lg text-[13px] border" style={{ borderColor: "#e7ddcf" }}>+ เพิ่มขั้นโบนัส</button>}
          </div>
        )}
        {isCeo && <button type="button" data-program-save disabled={busy} onClick={save} className="self-start h-11 px-6 rounded-xl font-semibold text-white disabled:opacity-50" style={{ background: "#2a1d1a" }}>{busy ? "กำลังบันทึก…" : "บันทึกราคา"}</button>}
        {msg && <p role="status" className="m-0 text-[14px]" style={{ color: msg.ok ? "#2f7a46" : "#b42335" }}>{msg.t}</p>}
        <span className="text-[12px] text-[#8a7b75]">ราคาใหม่ใช้กับผู้สมัครที่ได้งานแรกหลังบันทึก · รายการที่จ่ายไปแล้วไม่เปลี่ยน · ปิดส่วนนี้ = งดจ่ายค่าแนะนำ/โบนัสรายการใหม่</span>
      </section>

      {/* ผลงานแยกส่วน */}
      {tab === "parttime" ? (
        <section data-program-list="parttime" className="rounded-[20px] bg-white overflow-x-auto shadow-[0_4px_18px_rgba(90,60,20,.05)]">
          <div className="flex flex-wrap items-baseline gap-3 px-5 pt-4 pb-2"><b className="text-[16px]">ผู้สมัคร Part-time ที่ Recruit แนะนำ ({pt.length})</b><span className="text-[13px] text-[#8a7b75]">จ่ายค่าแนะนำแล้ว {pt.filter((r) => r.paidAt).length} คน · รวมจ่าย (ค่าแนะนำ + โบนัส) {baht(total)}</span></div>
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_110px_90px_120px_110px] gap-2 px-5 py-2 text-[12px] text-[#8a7b75] border-y" style={{ borderColor: "#ebe2d5" }}><span>ผู้สมัคร</span><span>Recruit ที่แนะนำ</span><span>สถานะ</span><span>ประเภท</span><span className="text-right">ค่าแนะนำ</span><span className="text-right">โบนัสรวม</span></div>
            {!pt.length && <p className="m-0 p-8 text-center text-[#8a7b75]">ยังไม่มีผู้สมัครที่มาจาก Recruit</p>}
            {pt.map((r) => (
              <div key={r.id} data-program-row className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_110px_90px_120px_110px] gap-2 px-5 py-2.5 items-center border-b last:border-b-0 text-[14px]" style={{ borderColor: "#ebe2d5" }}>
                <span className="min-w-0"><Link href={`/admin/applicants?q=${r.mb}`} className="font-semibold text-[#2a1d1a] hover:underline">{r.name}</Link><span className="block text-[12px] text-[#8a7b75]">{r.mb} · สมัคร {dt(r.at)}</span></span>
                <span className="min-w-0 truncate">{r.repId && r.repKind === "external" ? <a href={`/recruit/me?rep=${r.repId}`} target="_blank" rel="noopener noreferrer" className="text-[#8a6516] hover:underline">{r.rep} ↗</a> : r.rep}</span>
                <span>{r.status}</span>
                <span className="text-[13px]">{r.free ? "สมัครฟรี" : "จ่ายค่าสมัคร"}</span>
                <span className="text-right tabular-nums">{r.paidAt ? <b className="text-[#2f7a46]">{baht(r.paid)}</b> : <span className="text-[#8a7b75]">รองานแรก</span>}</span>
                <span className="text-right tabular-nums">{r.bonus ? baht(r.bonus) : "—"}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section data-program-list={tab} className="rounded-[20px] bg-white p-8 text-center text-[#8a7b75] shadow-[0_4px_18px_rgba(90,60,20,.05)]">
          {TITLE[tab]} · ยังไม่มีรายการ{programs[tab].enabled ? "" : " · ส่วนนี้ยังไม่เปิดให้ Recruit"}
        </section>
      )}
    </div>
  );
}
