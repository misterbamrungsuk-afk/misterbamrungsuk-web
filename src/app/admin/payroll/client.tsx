"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PayRow } from "@/lib/bookings/payroll";

const LINE = "rgba(240,200,90,.25)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const hm = (iso: string | null) => (iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) : "-");

export type WReq = { id: string; mb: string; nick: string; amount: number; fee: number; wht: number; net: number; bank: string; at: string };

export function PayrollClient({ day, today, rows, sample, reqs, isCeo }: { day: string; today: string; rows: PayRow[]; sample: boolean; reqs: WReq[]; isCeo: boolean }) {
  const [note, setNote] = useState<Record<string, string>>({});
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(sample ? rows[0]?.parttime_id ?? null : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const tot = rows.reduce((t, r) => ({ jobs: t.jobs + r.todayJobs, gross: t.gross + r.todayGross, pt: t.pt + r.todayPt, waiting: t.waiting + r.waiting, waitingN: t.waitingN + (r.waiting > 0 ? 1 : 0) }), { jobs: 0, gross: 0, pt: 0, waiting: 0, waitingN: 0 });

  const approve = async (body: Record<string, unknown>, key: string, label: string, url = "/api/admin/payroll") => {
    setBusy(key); setMsg(null);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { ok?: boolean; count?: number; amount?: number; error?: string } | null;
    setBusy(null);
    setMsg(j?.ok ? { ok: true, text: url === "/api/admin/payroll" ? `${label} · อนุมัติ ${j.count} งาน รวม ${baht(j.amount ?? 0)} เข้ากระเป๋าแล้ว` : label } : { ok: false, text: j?.error || "อนุมัติไม่สำเร็จ" });
    if (j?.ok) router.refresh();
  };

  return (
    <div className="flex flex-col gap-4 text-[13.5px]">
      {sample && (
        <p className="m-0 rounded-xl border px-4 py-3 text-[#f0c75a]" style={{ borderColor: "rgba(240,200,90,.45)", background: "rgba(240,200,90,.08)" }}>
          ข้อมูลตัวอย่าง 1 คน — ยังไม่มีงานจริงในระบบ · เมื่อมีงานแรกจบ หน้านี้จะแสดงข้อมูลจริงแทนอัตโนมัติ (ปุ่มอนุมัติของตัวอย่างกดไม่ได้)
        </p>
      )}

      <h2 className="m-0 text-[17px] font-semibold">ชั้นที่ 1 · อนุมัติรายได้เข้ากระเป๋า <span className="text-[13px] font-normal text-[#9a8a85]">(ตรวจงานรายวันของแต่ละคน)</span></h2>
      {/* วันที่ + สรุปรวม */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1"><span className="text-[12px] text-[#cdbfb3]">วันที่ตรวจงาน</span>
          <input type="date" value={day} max={today} onChange={(e) => e.target.value && router.push(`/admin/payroll?d=${e.target.value}`)} className="h-10 rounded-xl border bg-[#130e0e] px-3 text-[#f6efe4]" style={{ borderColor: LINE, colorScheme: "dark" }} />
        </label>
        {day !== today && <button type="button" onClick={() => router.push("/admin/payroll")} className="h-10 px-4 rounded-xl border text-[#f0c75a]" style={{ borderColor: LINE }}>วันนี้</button>}
        <button type="button" disabled={!isCeo || sample || !tot.waiting || !!busy} onClick={() => approve({ all: true }, "all", "ทุกคน")}
          className="ml-auto h-11 px-5 rounded-xl bg-crimson-500 text-white font-semibold disabled:opacity-40">
          {busy === "all" ? "กำลังอนุมัติ…" : `อนุมัติทั้งหมด ${tot.waitingN} คน · ${baht(tot.waiting)}`}
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[["งานที่จบวันนี้", `${tot.jobs} งาน`], ["ยอดลูกค้าจ่ายวันนี้", baht(tot.gross)], ["ส่วนของ Part-Time วันนี้", baht(tot.pt)], ["รออนุมัติเข้ากระเป๋า (ทุกวัน)", baht(tot.waiting)]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border p-3" style={{ borderColor: LINE, background: "#1c1414" }}><div className="text-[12px] text-[#cdbfb3]">{k}</div><b className="text-[18px] tabular-nums">{v}</b></div>
        ))}
      </div>
      {msg && <p role="status" className="m-0" style={{ color: msg.ok ? "#4ade80" : "#fca5a5" }}>{msg.text}</p>}

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
                <button type="button" disabled={!isCeo || r.sample || !r.waiting || !!busy} onClick={() => approve({ parttime_id: r.parttime_id }, r.parttime_id, r.nick)}
                  className="h-10 px-3 rounded-xl font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-35">
                  {busy === r.parttime_id ? "กำลังอนุมัติ…" : r.waiting ? `อนุมัติ ${baht(r.waiting)}` : "ไม่มียอดรอ"}
                </button>
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
                        <span className="text-right" style={{ color: j.matured ? "#4ade80" : "#f0c75a" }}>{j.matured ? "เข้ากระเป๋าแล้ว" : "รออนุมัติ"}</span>
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

      {/* ชั้นที่ 2: คำขอถอนเงินเข้าบัญชีธนาคาร */}
      <h2 className="m-0 mt-4 text-[17px] font-semibold">ชั้นที่ 2 · อนุมัติคำขอถอนเงิน <span className="text-[13px] font-normal text-[#9a8a85]">(อนุมัติแล้วส่งไปหน้า "โอนให้ Part-Time" ให้แอดมินโอนและกดเช็ก)</span></h2>
      <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: LINE }}>
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[minmax(0,1fr)_110px_100px_110px_minmax(0,1.3fr)_120px_260px] gap-2 px-3.5 py-2.5 bg-[#130e0e] text-[#9a8a85] text-xs">
            <span>Part-Time</span><span className="text-right">ขอถอน</span><span className="text-right">ค่าธรรมเนียม+ภาษี</span><span className="text-right">โอนสุทธิ</span><span>บัญชีปลายทาง</span><span>ขอเมื่อ</span><span />
          </div>
          {!reqs.length && <p className="m-0 p-6 text-center text-[#9a8a85]">ไม่มีคำขอถอนรออนุมัติ</p>}
          {reqs.map((w) => (
            <div key={w.id} className="grid grid-cols-[minmax(0,1fr)_110px_100px_110px_minmax(0,1.3fr)_120px_260px] gap-2 items-center px-3.5 py-3 border-t" style={{ borderColor: LINE }}>
              <span className="min-w-0"><b className="font-medium">{w.nick}</b><span className="block text-[12px] text-[#9a8a85]">{w.mb}</span></span>
              <span className="text-right tabular-nums">{baht(w.amount)}</span>
              <span className="text-right tabular-nums text-[#cdbfb3]">{baht(w.fee + w.wht)}</span>
              <b className="text-right tabular-nums text-[#f0c75a]">{baht(w.net)}</b>
              <span className="truncate text-[12.5px]">{w.bank}</span>
              <span className="text-[12.5px]">{hm(w.at)}</span>
              <span className="flex gap-1.5 items-center">
                <button type="button" disabled={!isCeo || !!busy} onClick={() => approve({ action: "approve", id: w.id }, w.id, `อนุมัติถอน ${w.nick} ${baht(w.net)} แล้ว · ส่งให้แอดมินโอน`, "/api/admin/withdrawals")} className="h-10 px-3 rounded-xl font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-35">{busy === w.id ? "…" : "อนุมัติถอน"}</button>
                <input value={note[w.id] ?? ""} onChange={(e) => setNote({ ...note, [w.id]: e.target.value })} placeholder="เหตุผลถ้าไม่อนุมัติ" disabled={!isCeo} className="h-10 min-w-0 flex-1 rounded-xl border bg-[#130e0e] px-2 text-[12.5px]" style={{ borderColor: LINE }} />
                <button type="button" disabled={!isCeo || !!busy || !(note[w.id] ?? "").trim()} onClick={() => approve({ action: "reject", id: w.id, note: note[w.id] }, w.id, `ไม่อนุมัติ · คืนยอดให้ ${w.nick} แล้ว`, "/api/admin/withdrawals")} className="h-10 px-2.5 rounded-xl border text-[12.5px] text-[#fecaca] disabled:opacity-35" style={{ borderColor: "rgba(201,40,61,.6)" }}>ไม่อนุมัติ</button>
              </span>
            </div>
          ))}
        </div>
      </div>
      {!isCeo && <p className="m-0 text-[12.5px] text-[#9a8a85]">บัญชีของคุณดูได้อย่างเดียว · การอนุมัติทั้ง 2 ชั้นทำได้เฉพาะบัญชี CEO</p>}
    </div>
  );
}
