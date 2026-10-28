"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PayRow } from "@/lib/bookings/payroll";
import type { StayReq } from "@/lib/admin/ceo-room";
import { EXPIRED, useConfirm } from "../confirm";

const LINE = "rgba(240,200,90,.25)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const hm = (iso: string | null) => (iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) : "-");

export type WReq = { id: string; mb: string; nick: string; name?: string; newBank?: boolean; firstTime?: boolean; amount: number; fee: number; wht: number; net: number; bank: string; at: string };

export type SReq = { id: string; name: string; code: string; amount: number; bank: string; at: string };
export type BReq = { id: string; rep: string; code: string; pt: string; month: string; jobs: number; amount: number };
export type OReq = { id: string; type: "partner" | "vendor" | "customer"; name: string; amount: number; bank: string; at: string; newBank?: boolean };

export function PayrollClient({ day, today, rows, sample, reqs, salesReqs = [], ownerReqs = [], bonusReqs = [], lastMonth = "", isCeo, base = "/admin/payroll", stays = [] }: { base?: string; stays?: StayReq[]; day: string; today: string; rows: PayRow[]; sample: boolean; reqs: WReq[]; salesReqs?: SReq[]; ownerReqs?: OReq[]; bonusReqs?: BReq[]; lastMonth?: string; isCeo: boolean }) {
  const [note, setNote] = useState<Record<string, string>>({});
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(sample ? rows[0]?.parttime_id ?? null : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmUi, ask] = useConfirm();
  const tot = rows.reduce((t, r) => ({ jobs: t.jobs + r.todayJobs, gross: t.gross + r.todayGross, pt: t.pt + r.todayPt, waiting: t.waiting + r.waiting, waitingN: t.waitingN + (r.waiting > 0 ? 1 : 0) }), { jobs: 0, gross: 0, pt: 0, waiting: 0, waitingN: 0 });

  // ทุกปุ่มในหน้านี้ย้ายเงิน (เข้ากระเป๋า / อนุมัติถอน / คืนยอด) → ยืนยันในหน้าก่อนทุกครั้ง
  const approve = async (body: Record<string, unknown>, key: string, label: string, url = "/api/admin/payroll", sure?: { title: string; body: string; danger?: boolean }) => {
    if (sure && !(await ask({ ...sure, ok: sure.danger ? "ไม่อนุมัติ" : "อนุมัติ" }))) return;
    setBusy(key); setMsg(null);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { ok?: boolean; count?: number; amount?: number; error?: string } | null;
    setBusy(null);
    if (r?.status === 401) { setMsg({ ok: false, text: EXPIRED }); return; }
    setMsg(j?.ok ? { ok: true, text: body.action === "stay_settle" ? `${label} · ${baht(j.amount ?? 0)} เข้ากระเป๋าโรงแรมแล้ว` : url === "/api/admin/payroll" ? `${label} · อนุมัติ ${j.count} งาน รวม ${baht(j.amount ?? 0)} เข้ากระเป๋าแล้ว` : label } : { ok: false, text: j?.error || "อนุมัติไม่สำเร็จ" });
    if (j?.ok) router.refresh();
  };

  return (
    <div className="flex flex-col gap-4 text-[13.5px]">
      {sample && (
        <p className="m-0 rounded-xl border px-4 py-3 text-[#f0c75a]" style={{ borderColor: "rgba(240,200,90,.45)", background: "rgba(240,200,90,.08)" }}>
          ข้อมูลตัวอย่าง 1 คน — ยังไม่มีงานจริงในระบบ · เมื่อมีงานแรกจบ หน้านี้จะแสดงข้อมูลจริงแทนอัตโนมัติ (ปุ่มอนุมัติของตัวอย่างกดไม่ได้)
        </p>
      )}

      <h2 className="m-0 text-[17px] font-semibold">1 · อนุมัติเงินเข้ากระเป๋า · Part-Time <span className="text-[13px] font-normal text-[#9a8a85]">(ตรวจงานรายวันของแต่ละคน)</span></h2>
      {/* วันที่ + สรุปรวม */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1"><span className="text-[12px] text-[#cdbfb3]">วันที่ตรวจงาน</span>
          <input type="date" value={day} max={today} onChange={(e) => e.target.value && router.push(`${base}?d=${e.target.value}`)} className="h-10 rounded-xl border bg-[#130e0e] px-3 text-[#f6efe4]" style={{ borderColor: LINE, colorScheme: "dark" }} />
        </label>
        {day !== today && <button type="button" onClick={() => router.push(base)} className="h-10 px-4 rounded-xl border text-[#f0c75a]" style={{ borderColor: LINE }}>วันนี้</button>}
        {isCeo ? <button type="button" data-ceo-approve disabled={!isCeo || sample || !tot.waiting || !!busy} onClick={() => approve({ all: true }, "all", "ทุกคน", undefined, { title: "อนุมัติรายได้เข้ากระเป๋าทุกคน?", body: `${tot.waitingN} คน · รวม ${baht(tot.waiting)}
อนุมัติแล้ว Part-Time ถอนได้ทันที` })}
          className="ml-auto h-11 px-5 rounded-xl bg-crimson-500 text-white font-semibold disabled:opacity-40">
          {busy === "all" ? "กำลังอนุมัติ…" : `อนุมัติทั้งหมด ${tot.waitingN} คน · ${baht(tot.waiting)}`}
        </button> : <span data-wait-ceo className="h-10 px-3 rounded-xl grid place-items-center text-[12.5px] font-semibold text-[#8a6516] bg-[#f6ecd2]">รอ CEO อนุมัติ</span>}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[["งานที่จบวันนี้", `${tot.jobs} งาน`], ["ยอดลูกค้าจ่ายวันนี้", baht(tot.gross)], ["ส่วนของ Part-Time วันนี้", baht(tot.pt)], ["รออนุมัติเข้ากระเป๋า (ทุกวัน)", baht(tot.waiting)]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border p-3" style={{ borderColor: LINE, background: "#ffffff" }}><div className="text-[12px] text-[#cdbfb3]">{k}</div><b className="text-[18px] tabular-nums">{v}</b></div>
        ))}
      </div>
      {msg && <p role="status" className="m-0" style={{ color: msg.ok ? "#2f7a46" : "#b42335" }}>{msg.text}{msg.text === EXPIRED && <> · <a href="/admin-login" className="underline text-[#ffd76a]">ไปหน้าเข้าสู่ระบบ</a></>}</p>}
      {confirmUi}

      {/* รายการรายคน */}
      <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: LINE }}>
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[minmax(0,1.4fr)_80px_110px_110px_120px_110px_110px_170px] gap-2 px-3.5 py-2.5 bg-[#130e0e] text-[#9a8a85] text-xs">
            <span>Part-Time</span><span className="text-right">งานวันนี้</span><span className="text-right">ส่วน PT วันนี้</span><span className="text-right">นัดที่เหลือวันนี้</span><span className="text-right">รออนุมัติ</span><span className="text-right">ถอนได้</span><span className="text-right">กำลังถอน</span><span />
          </div>
          {!rows.length && <p className="m-0 p-6 text-center text-[#9a8a85]">ยังไม่มี Part-Time ที่มีงานหรือยอดเงิน</p>}
          {rows.map((r) => (
            <div key={r.parttime_id} className="border-t" style={{ borderColor: LINE }}>
              <div className="grid grid-cols-[minmax(0,1.4fr)_80px_110px_110px_120px_110px_110px_170px] gap-2 items-center px-3.5 py-3">
                <button type="button" onClick={() => setOpen(open === r.parttime_id ? null : r.parttime_id)} aria-expanded={open === r.parttime_id} className="text-left min-w-0 flex items-center gap-2">
                  <span className="text-[#f0c75a] w-4">{open === r.parttime_id ? "▾" : "▸"}</span>
                  <span className="min-w-0"><b className="font-medium">{r.nick}{r.sample && <span className="ml-1.5 text-[11.5px] text-[#f0c75a]">ตัวอย่าง</span>}</b><span className="block text-[12px] text-[#9a8a85] truncate">{r.mb}{r.name ? ` · ${r.name}` : ""}</span></span>
                </button>
                <span className="text-right tabular-nums">{r.todayJobs}</span>
                <span className="text-right tabular-nums">{baht(r.todayPt)}</span>
                <span className="text-right tabular-nums">{r.todayUpcoming}</span>
                <span className="text-right tabular-nums" style={{ color: r.waiting ? "#f0c75a" : undefined }}>{baht(r.waiting)}<span className="block text-[11.5px] text-[#9a8a85]">{r.waitingJobs} งาน</span></span>
                <span className="text-right tabular-nums text-[#4ade80]">{baht(r.available)}</span>
                <span className="text-right tabular-nums">{baht(r.withdrawing)}</span>
                {isCeo ? <button type="button" data-ceo-approve disabled={!isCeo || r.sample || !r.waiting || !!busy} onClick={() => approve({ parttime_id: r.parttime_id }, r.parttime_id, r.nick, undefined, { title: `อนุมัติรายได้ ${r.nick}?`, body: `${r.mb} · ${r.waitingJobs} งาน · ${baht(r.waiting)} เข้ากระเป๋า` })}
                  className="h-10 px-3 rounded-xl font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-35">
                  {busy === r.parttime_id ? "กำลังอนุมัติ…" : r.waiting ? `อนุมัติ ${baht(r.waiting)}` : "ไม่มียอดรอ"}
                </button> : <span data-wait-ceo className="h-10 px-3 rounded-xl grid place-items-center text-[12.5px] font-semibold text-[#8a6516] bg-[#f6ecd2]">รอ CEO อนุมัติ</span>}
              </div>
              {open === r.parttime_id && (
                <div className="px-3.5 pb-4">
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: LINE }}>
                    <div className="grid grid-cols-[110px_minmax(0,1fr)_120px_60px_100px_90px_70px_110px_110px] gap-2 px-3 py-2 bg-[#130e0e] text-[#9a8a85] text-xs">
                      <span>รหัสนัด</span><span>ลูกค้า</span><span>จบงาน</span><span className="text-right">ชม.</span><span className="text-right">ค่านัด</span><span className="text-right">ทิป</span><span className="text-right">ส่วนแบ่ง</span><span className="text-right">เข้า PT</span><span className="text-right">สถานะ</span>
                    </div>
                    {!r.jobs.length && <p className="m-0 p-4 text-center text-[#9a8a85]">ไม่มีงานที่จบในวันนี้หรือรออนุมัติ</p>}
                    {r.jobs.map((j) => (
                      <div key={j.id} className="grid grid-cols-[110px_minmax(0,1fr)_120px_60px_100px_90px_70px_110px_110px] gap-2 px-3 py-2.5 border-t items-center" style={{ borderColor: LINE }}>
                        <span className="tabular-nums">{j.code}</span><span className="truncate">{j.customer}</span><span>{hm(j.completed_at)}</span>
                        <span className="text-right">{j.hours}</span><span className="text-right tabular-nums">{baht(j.price)}</span><span className="text-right tabular-nums">{j.tip ? baht(j.tip) : "-"}</span>
                        <span className="text-right">{j.pct != null ? `${j.pct}%` : "-"}</span><b className="text-right tabular-nums">{baht(j.pt)}</b>
                        <span className="text-right" style={{ color: j.matured ? "#2f7a46" : "#f0c75a" }}>{j.matured ? "เข้ากระเป๋าแล้ว" : "รออนุมัติ"}</span>
                      </div>
                    ))}
                  </div>
                  <p className="m-0 mt-2 text-[12px] text-[#9a8a85]">เข้า PT = ค่านัด × ส่วนแบ่ง + ทิปตามสัดส่วนที่ตั้งไว้ · อนุมัติแล้ว Part-Time ถอนเงินหรือใช้ยอดในกระเป๋าได้ทันที</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ค่าห้องพักโรงแรมที่เช็กเอาต์แล้ว → รอ CEO อนุมัติเข้ากระเป๋าโรงแรม (28 ต.ค. 2569) */}
      <h2 className="m-0 mt-4 text-[17px] font-semibold">ค่าห้องพักรอเข้ากระเป๋าโรงแรม <span className="text-[13px] font-normal text-[#9a8a85]">(เช็กเอาต์แล้ว · หัก % แพลตฟอร์มแล้ว · คืนเงินลูกค้าทำที่หน้า "จองห้องพัก")</span></h2>
      <div data-stay-queue className="rounded-2xl border" style={{ borderColor: LINE }}>
        {!stays.length && <p className="m-0 p-5 text-center text-[#9a8a85]">ไม่มีค่าห้องพักรออนุมัติ</p>}
        {stays.map((w) => (
          <div key={w.id} data-stay-row={w.code} className="flex flex-wrap items-center gap-2 px-3.5 py-3 border-t first:border-t-0" style={{ borderColor: LINE }}>
            <span className="flex-1 min-w-[220px]"><b className="font-medium">{w.hotel}</b> <span className="text-[#9a8a85]">({w.code})</span><span className="block text-[12.5px] text-[#9a8a85]">{w.room} · {w.nights} คืน · เช็กเอาต์ {w.check_out} · ลูกค้าจ่าย {baht(w.total)} · หัก {w.pct}%</span></span>
            <b className="tabular-nums text-[#f0c75a]">{baht(w.net)}</b>
            {isCeo ? <button type="button" data-ceo-approve disabled={!!busy} onClick={() => approve({ action: "stay_settle", id: w.id }, w.id, `อนุมัติค่าห้อง ${w.code}`, undefined, { title: `อนุมัติค่าห้อง ${w.code}?`, body: `${w.hotel} · ${baht(w.net)} เข้ากระเป๋าโรงแรม` })} className="h-10 px-4 rounded-xl font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-35">{busy === w.id ? "…" : "อนุมัติเข้ากระเป๋า"}</button> : <span data-wait-ceo className="h-10 px-3 rounded-xl grid place-items-center text-[12.5px] font-semibold text-[#8a6516] bg-[#f6ecd2]">รอ CEO อนุมัติ</span>}
          </div>
        ))}
      </div>

      {/* ชั้นที่ 2: คำขอถอนเงินเข้าบัญชีธนาคาร */}
      <h2 className="m-0 mt-4 text-[17px] font-semibold">2 · อนุมัติคำขอถอนเงิน · Part-Time <span className="text-[13px] font-normal text-[#9a8a85]">(อนุมัติแล้วส่งไปหน้า "โอนเงิน" ให้แอดมินโอนและกดเช็ก)</span></h2>
      <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: LINE }}>
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[minmax(0,1fr)_110px_100px_110px_minmax(0,1.3fr)_120px_260px] gap-2 px-3.5 py-2.5 bg-[#130e0e] text-[#9a8a85] text-xs">
            <span>Part-Time</span><span className="text-right">ขอถอน</span><span className="text-right">ค่าธรรมเนียม+ภาษี</span><span className="text-right">โอนสุทธิ</span><span>บัญชีปลายทาง</span><span>ขอเมื่อ</span><span />
          </div>
          {!reqs.length && <p className="m-0 p-6 text-center text-[#9a8a85]">ไม่มีคำขอถอนรออนุมัติ</p>}
          {reqs.map((w) => (
            <div key={w.id} className="grid grid-cols-[minmax(0,1fr)_110px_100px_110px_minmax(0,1.3fr)_120px_260px] gap-2 items-center px-3.5 py-3 border-t" style={{ borderColor: LINE }}>
              <span className="min-w-0"><b className="font-medium">{w.nick}</b>{w.newBank && <span className="ml-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold text-[#1b130b] bg-[#f0a35a]">บัญชีใหม่</span>}{w.firstTime && <span className="ml-1.5 rounded-full px-2 py-0.5 text-[11px] border border-[#f0a35a] text-[#f0a35a]">ถอนครั้งแรก</span>}<span className="block text-[12px] text-[#9a8a85] truncate">{w.mb}{w.name ? ` · ${w.name}` : ""}</span></span>
              <span className="text-right tabular-nums">{baht(w.amount)}</span>
              <span className="text-right tabular-nums text-[#cdbfb3]">{baht(w.fee + w.wht)}</span>
              <b className="text-right tabular-nums text-[#f0c75a]">{baht(w.net)}</b>
              <span className="truncate text-[12.5px]">{w.bank}</span>
              <span className="text-[12.5px]">{hm(w.at)}</span>
              <span className="flex gap-1.5 items-center">
                {isCeo ? <button type="button" data-ceo-approve disabled={!isCeo || !!busy} onClick={() => approve({ action: "approve", id: w.id }, w.id, `อนุมัติถอน ${w.nick} ${baht(w.net)} แล้ว · ส่งให้แอดมินโอน`, "/api/admin/withdrawals", { title: `อนุมัติถอน ${w.nick}?`, body: `${w.mb}${w.name ? ` · ${w.name}` : ""}
โอนสุทธิ ${baht(w.net)} เข้า ${w.bank}${w.newBank ? "\n⚠ บัญชีใหม่ (ต่างจากที่เคยโอนสำเร็จ) — ตรวจชื่อบัญชีก่อน" : ""}` })} className="h-10 px-3 rounded-xl font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-35">{busy === w.id ? "…" : "อนุมัติถอน"}</button> : <span data-wait-ceo className="h-10 px-3 rounded-xl grid place-items-center text-[12.5px] font-semibold text-[#8a6516] bg-[#f6ecd2]">รอ CEO อนุมัติ</span>}
                {isCeo && <input value={note[w.id] ?? ""} onChange={(e) => setNote({ ...note, [w.id]: e.target.value })} placeholder="เหตุผลถ้าไม่อนุมัติ" disabled={!isCeo} className="h-10 min-w-0 flex-1 rounded-xl border bg-[#130e0e] px-2 text-[12.5px]" style={{ borderColor: LINE }} />}
                {isCeo && <button type="button" disabled={!isCeo || !!busy || !(note[w.id] ?? "").trim()} onClick={() => approve({ action: "reject", id: w.id, note: note[w.id] }, w.id, `ไม่อนุมัติ · คืนยอดให้ ${w.nick} แล้ว`, "/api/admin/withdrawals", { title: `ไม่อนุมัติคำขอถอน ${w.nick}?`, body: `${baht(w.amount)} คืนเข้ากระเป๋า
เหตุผล: ${note[w.id] ?? ""}`, danger: true })} className="h-10 px-2.5 rounded-xl border text-[12.5px] text-[#fecaca] disabled:opacity-35" style={{ borderColor: "rgba(201,40,61,.6)" }}>ไม่อนุมัติ</button>}
              </span>
            </div>
          ))}
        </div>
      </div>
      <h2 className="m-0 mt-4 text-[17px] font-semibold flex flex-wrap items-center gap-2">โบนัส Recruit รายเดือน <span className="text-[13px] font-normal text-[#9a8a85]">(ผู้สมัครที่ Recruit แนะนำ ทำครบ 15 งาน = ฿1,000 · 20 งาน = ฿2,000 · พิจารณาคุณภาพก่อนอนุมัติ)</span>
        {isCeo && <button type="button" data-recruit-bonus-compute disabled={!!busy} onClick={() => approve({ action: "compute", month: lastMonth }, "rb-compute", `คำนวณโบนัสเดือน ${lastMonth} แล้ว`, "/api/admin/recruit-bonus")} className="ml-auto h-9 px-3.5 rounded-full border text-[12.5px]" style={{ borderColor: LINE }}>คำนวณเดือน {lastMonth}</button>}</h2>
      <div data-recruit-bonus-queue className="rounded-2xl border" style={{ borderColor: LINE }}>
        {!bonusReqs.length && <p className="m-0 p-5 text-center text-[#9a8a85]">ไม่มีโบนัสรออนุมัติ · ระบบคำนวณเดือนที่แล้วให้อัตโนมัติทุกวัน</p>}
        {bonusReqs.map((w) => (
          <div key={w.id} data-recruit-bonus-row className="flex flex-wrap items-center gap-2 px-3.5 py-3 border-t first:border-t-0" style={{ borderColor: LINE }}>
            <span className="flex-1 min-w-[220px]"><b className="font-medium">{w.rep}</b> <span className="text-[#9a8a85]">({w.code})</span><span className="block text-[12.5px] text-[#9a8a85]">{w.pt} · ทำ {w.jobs} งาน · เดือน {w.month}</span></span>
            <b className="tabular-nums text-[#f0c75a]">{baht(w.amount)}</b>
            {isCeo ? <button type="button" data-ceo-approve disabled={!isCeo || !!busy} onClick={() => approve({ action: "approve", id: w.id }, w.id, `อนุมัติโบนัส ${w.rep} ${baht(w.amount)} · เข้ากระเป๋าแล้ว`, "/api/admin/recruit-bonus", { title: `อนุมัติโบนัส ${baht(w.amount)}?`, body: `${w.rep} · ${w.pt} ทำ ${w.jobs} งาน เดือน ${w.month}\nเงินเข้ากระเป๋า Recruit ทันที` })} className="h-10 px-4 rounded-full text-[13px] font-semibold text-white disabled:opacity-40" style={{ background: "#2f7a46" }}>อนุมัติ</button> : <span data-wait-ceo className="h-10 px-3 rounded-xl grid place-items-center text-[12.5px] font-semibold text-[#8a6516] bg-[#f6ecd2]">รอ CEO อนุมัติ</span>}
            {isCeo && <input value={note[w.id] ?? ""} onChange={(e) => setNote({ ...note, [w.id]: e.target.value })} placeholder="เหตุผลถ้าไม่อนุมัติ" disabled={!isCeo} className="h-10 w-44 rounded-xl border bg-[#130e0e] px-2 text-[12.5px]" style={{ borderColor: LINE }} />}
            {isCeo && <button type="button" disabled={!isCeo || !!busy || !(note[w.id] ?? "").trim()} onClick={() => approve({ action: "reject", id: w.id, note: note[w.id] }, w.id, `ไม่อนุมัติโบนัส ${w.rep}`, "/api/admin/recruit-bonus", { title: "ไม่อนุมัติโบนัสนี้?", body: note[w.id] ?? "", danger: true })} className="h-10 px-4 rounded-full border text-[13px] disabled:opacity-40" style={{ borderColor: "#f3c2c9", color: "#b42335" }}>ไม่อนุมัติ</button>}
          </div>
        ))}
      </div>
      <h2 className="m-0 mt-4 text-[17px] font-semibold">ค่าคอม Recruit ภายนอก <span className="text-[13px] font-normal text-[#9a8a85]">(อนุมัติแล้วไปหน้า "เมมเบอร์ · Recruit" ให้แอดมินโอน)</span></h2>
      <div className="rounded-2xl border" style={{ borderColor: LINE }}>
        {!salesReqs.length && <p className="m-0 p-5 text-center text-[#9a8a85]">ไม่มีคำขอรับค่าคอมรออนุมัติ</p>}
        {salesReqs.map((w) => (
          <div key={w.id} className="flex flex-wrap items-center gap-2 px-3.5 py-3 border-t first:border-t-0" style={{ borderColor: LINE }}>
            <span className="flex-1 min-w-[220px]"><b className="font-medium">{w.name}</b> <span className="text-[#9a8a85]">({w.code})</span><span className="block text-[12.5px] text-[#9a8a85]">{w.bank} · {hm(w.at)}</span></span>
            <b className="tabular-nums text-[#f0c75a]">{baht(w.amount)}</b>
            {isCeo ? <button type="button" data-ceo-approve disabled={!isCeo || !!busy} onClick={() => approve({ action: "payout_approve", id: w.id }, w.id, `อนุมัติค่าคอม ${w.name} ${baht(w.amount)} · ส่งให้แอดมินโอน`, "/api/admin/sales", { title: `อนุมัติค่าคอม ${w.name}?`, body: `${baht(w.amount)} · ${w.bank}` })} className="h-10 px-3 rounded-xl font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-35">อนุมัติ</button> : <span data-wait-ceo className="h-10 px-3 rounded-xl grid place-items-center text-[12.5px] font-semibold text-[#8a6516] bg-[#f6ecd2]">รอ CEO อนุมัติ</span>}
            {isCeo && <input value={note[w.id] ?? ""} onChange={(e) => setNote({ ...note, [w.id]: e.target.value })} placeholder="เหตุผลถ้าไม่อนุมัติ" disabled={!isCeo} className="h-10 w-44 rounded-xl border bg-[#130e0e] px-2 text-[12.5px]" style={{ borderColor: LINE }} />}
            {isCeo && <button type="button" disabled={!isCeo || !!busy || !(note[w.id] ?? "").trim()} onClick={() => approve({ action: "payout_reject", id: w.id, note: note[w.id] }, w.id, `ไม่อนุมัติ · คืนยอดให้ ${w.name} แล้ว`, "/api/admin/sales", { title: `ไม่อนุมัติค่าคอม ${w.name}?`, body: `เหตุผล: ${note[w.id] ?? ""}`, danger: true })} className="h-10 px-2.5 rounded-xl border text-[12.5px] text-[#fecaca] disabled:opacity-35" style={{ borderColor: "rgba(201,40,61,.6)" }}>ไม่อนุมัติ</button>}
          </div>
        ))}
      </div>
      {([["partner", "พาร์ทเนอร์ (โรงแรม · สปา)", "ค่าห้องจากนัดที่จบแล้ว"], ["vendor", "ร้านค้า Marketplace", "ส่วนของร้านจากออเดอร์ที่สำเร็จ"], ["customer", "ลูกค้า", "ยอดเติมเงินในกระเป๋า ไม่รวมเครดิตโบนัส · ตรวจชื่อบัญชีตรงกับชื่อลูกค้า"]] as const).map(([t, title, src]) => {
        const list = ownerReqs.filter((w) => w.type === t);
        return (
          <section key={t} className="flex flex-col gap-2">
            <h2 className="m-0 mt-4 text-[17px] font-semibold">ถอนเงิน{title} <span className="text-[13px] font-normal text-[#9a8a85]">({src} · อนุมัติแล้วไปหน้า "โอนเงิน" ให้แอดมินโอน)</span></h2>
            <div className="rounded-2xl border" style={{ borderColor: LINE }}>
              {!list.length && <p className="m-0 p-5 text-center text-[#9a8a85]">ไม่มีคำขอถอนรออนุมัติ</p>}
              {list.map((w) => (
                <div key={w.id} className="flex flex-wrap items-center gap-2 px-3.5 py-3 border-t first:border-t-0" style={{ borderColor: LINE }}>
                  <span className="flex-1 min-w-[220px]"><b className="font-medium">{w.name}</b>{w.newBank && <span className="ml-2 rounded-full px-2 py-0.5 text-[11.5px] font-semibold text-[#1b130b] bg-[#f0a35a]">บัญชีใหม่ · ตรวจชื่อบัญชีก่อนอนุมัติ</span>}<span className="block text-[12.5px] text-[#9a8a85]">{w.bank} · {hm(w.at)}</span></span>
                  <b className="tabular-nums text-[#f0c75a]">{baht(w.amount)}</b>
                  {isCeo ? <button type="button" data-ceo-approve disabled={!isCeo || !!busy} onClick={() => approve({ action: "approve", id: w.id }, w.id, `อนุมัติถอน ${w.name} ${baht(w.amount)} · ส่งให้แอดมินโอน`, "/api/admin/payout-requests", { title: `อนุมัติถอน ${w.name}?`, body: `${baht(w.amount)} เข้า ${w.bank}${w.newBank ? "\n⚠ บัญชีใหม่ — ตรวจชื่อบัญชีก่อน" : ""}` })} className="h-10 px-3 rounded-xl font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-35">{busy === w.id ? "…" : "อนุมัติถอน"}</button> : <span data-wait-ceo className="h-10 px-3 rounded-xl grid place-items-center text-[12.5px] font-semibold text-[#8a6516] bg-[#f6ecd2]">รอ CEO อนุมัติ</span>}
                  {isCeo && <input value={note[w.id] ?? ""} onChange={(e) => setNote({ ...note, [w.id]: e.target.value })} placeholder="เหตุผลถ้าไม่อนุมัติ" disabled={!isCeo} className="h-10 w-44 rounded-xl border bg-[#130e0e] px-2 text-[12.5px]" style={{ borderColor: LINE }} />}
                  {isCeo && <button type="button" disabled={!isCeo || !!busy || !(note[w.id] ?? "").trim()} onClick={() => approve({ action: "reject", id: w.id, note: note[w.id] }, w.id, `ไม่อนุมัติ · คืนยอดให้ ${w.name} แล้ว`, "/api/admin/payout-requests", { title: `ไม่อนุมัติคำขอถอน ${w.name}?`, body: `${baht(w.amount)} คืนเข้ากระเป๋า
เหตุผล: ${note[w.id] ?? ""}`, danger: true })} className="h-10 px-2.5 rounded-xl border text-[12.5px] text-[#fecaca] disabled:opacity-35" style={{ borderColor: "rgba(201,40,61,.6)" }}>ไม่อนุมัติ</button>}
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {!isCeo && <p className="m-0 text-[12.5px] text-[#9a8a85]">ดูอย่างเดียว · การอนุมัติทุกรายการทำได้เฉพาะ CEO ที่ห้อง CEO</p>}
    </div>
  );
}
