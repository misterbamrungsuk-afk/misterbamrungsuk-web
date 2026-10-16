"use client";

// การจองทั้งหมด (ข้อมูลจริง) — กรองตามสถานะ · ตัดสินคำขอยกเลิก / ข้อพิพาท (คืนลูกค้า % · ส่วนที่เหลือแบ่งตามปกติ)
import { useEffect, useMemo, useState } from "react";

type B = { id: string; code: string; status: string; customer_email: string | null; parttime_mb: string; parttime_nick: string | null; starts_at: string; hours: number; total_satang: number; place: { label: string; detail: string }; decline_reason: string | null; resolution: Record<string, unknown> | null; created_at: string };
const GOLD = "#f0c75a";
const LINE = "rgba(240,200,90,.38)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US");
const ST: Record<string, [string, string]> = {
  requested: ["รอ Part-Time ตอบ", "#eed58a"], accepted: ["ยืนยันแล้ว", "#4ade80"], checked_in: ["ระหว่างนัด", "#4ade80"], completed: ["จบงาน", "#cdbfb3"],
  cancel_requested: ["ขอยกเลิก · รอตัดสิน", "#fca5a5"], disputed: ["ข้อพิพาท · รอตัดสิน", "#fca5a5"], declined: ["ปฏิเสธ", "#7d6d6a"], expired: ["หมดเวลา", "#7d6d6a"], cancelled: ["ยกเลิก", "#7d6d6a"], refunded: ["คืนเงินแล้ว", "#7d6d6a"],
};
const F: [string, string][] = [["todo", "รอตัดสิน"], ["live", "กำลังดำเนินการ"], ["completed", "จบงาน"], ["closed", "ยกเลิก/คืนเงิน"], ["all", "ทั้งหมด"]];
const match = (b: B, f: string) => f === "all" ? true : f === "todo" ? ["cancel_requested", "disputed"].includes(b.status) : f === "live" ? ["requested", "accepted", "checked_in"].includes(b.status) : f === "completed" ? b.status === "completed" : ["declined", "expired", "cancelled", "refunded"].includes(b.status);
const fmt = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" });

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<B[] | null>(null);
  const [err, setErr] = useState("");
  const [f, setF] = useState("todo");
  const [sel, setSel] = useState<string | null>(null);
  const [pct, setPct] = useState(100);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const load = () => fetch("/api/admin/bookings", { cache: "no-store" }).then((r) => r.json()).then((d) => (d?.ok ? setRows(d.bookings) : (setErr(d?.error || "โหลดไม่สำเร็จ"), setRows([])))).catch(() => setRows([]));
  useEffect(() => { load(); }, []);
  const shown = useMemo(() => (rows ?? []).filter((b) => match(b, f)), [rows, f]);
  const cur = (rows ?? []).find((b) => b.id === sel) ?? shown[0] ?? null;
  const resolve = async (action: "refund" | "reject") => {
    if (!cur) return;
    setBusy(true);
    const r = await fetch("/api/admin/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cur.id, action, refund_pct: pct, note }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false); setMsg(d.ok ? "บันทึกผลตัดสินแล้ว" : d.error ?? "บันทึกไม่สำเร็จ");
    if (d.ok) { setNote(""); load(); }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      <div className="flex-1 min-w-0 w-full flex flex-col gap-3.5">
        <div><div className="text-[11px] tracking-[2.5px] font-semibold" style={{ color: GOLD }}>BOOKINGS</div><h1 className="mt-0.5 font-lux font-bold text-2xl">การจอง · เงินพักไว้</h1></div>
        <div className="flex flex-wrap gap-1.5">
          {F.map(([k, l]) => { const n = (rows ?? []).filter((b) => match(b, k)).length; const on = f === k; return <button key={k} onClick={() => setF(k)} aria-pressed={on} className="h-9 px-3.5 rounded-full border text-[12.5px] font-semibold" style={{ borderColor: on ? GOLD : LINE, background: on ? GOLD : "transparent", color: on ? "#1a1206" : "#d3c7bc" }}>{l} {n}</button>; })}
        </div>
        {err && <p className="text-sm text-[#fca5a5]">{err} · ต้องรัน supabase/booking/0001_booking.sql</p>}
        {msg && <p role="status" className="text-sm text-[#eed58a]">{msg}</p>}
        <div className="rounded-2xl border overflow-x-auto text-[13px]" style={{ borderColor: LINE }}>
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[100px_minmax(0,1.2fr)_110px_130px_100px_150px] px-3.5 py-2.5 bg-[#130e0e] text-[#7d6d6a] text-xs"><span>รหัส</span><span>ลูกค้า → Part-Time</span><span>ยอด</span><span>เวลานัด</span><span>ชม.</span><span>สถานะ</span></div>
            {shown.map((b) => (
              <button key={b.id} onClick={() => { setSel(b.id); setMsg(""); }} className="w-full grid grid-cols-[100px_minmax(0,1.2fr)_110px_130px_100px_150px] px-3.5 py-[11px] border-t text-left items-center" style={{ borderColor: LINE, background: cur?.id === b.id ? "rgba(240,200,90,.16)" : "transparent" }}>
                <span className="text-[#ffd76a]">{b.code}</span><span className="truncate pr-2">{b.customer_email} → {b.parttime_nick} ({b.parttime_mb})</span><span>{baht(b.total_satang)}</span><span>{fmt(b.starts_at)}</span><span>{b.hours}</span><span style={{ color: (ST[b.status] ?? [b.status, "#cdbfb3"])[1] }}>{(ST[b.status] ?? [b.status])[0]}</span>
              </button>
            ))}
            {rows !== null && !shown.length && <p className="border-t px-4 py-10 text-center text-[#7d6d6a]" style={{ borderColor: LINE }}>ไม่มีรายการในหมวดนี้</p>}
          </div>
        </div>
      </div>
      <aside className="w-full lg:w-[320px] shrink-0 p-[18px] rounded-[18px] border bg-[#241717] flex flex-col gap-2.5 text-[13px]" style={{ borderColor: "rgba(245,210,110,.85)" }}>
        {!cur ? <p className="py-10 text-center text-[#7d6d6a]">เลือกการจอง</p> : <>
          <div className="font-lux font-semibold text-[17px]">{cur.code}</div>
          {[["สถานะ", (ST[cur.status] ?? [cur.status])[0]], ["ลูกค้า", cur.customer_email ?? "-"], ["Part-Time", `${cur.parttime_nick} · ${cur.parttime_mb}`], ["เวลานัด", `${fmt(cur.starts_at)} · ${cur.hours} ชม.`], ["สถานที่", `${cur.place.label} ${cur.place.detail}`], ["ยอดรวม", baht(cur.total_satang)], ["จองเมื่อ", fmt(cur.created_at)]].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><span className="text-[#cdbfb3] shrink-0">{k}</span><span className="text-right">{v}</span></div>)}
          {cur.decline_reason && <p className="m-0 text-[12.5px] text-[#eed58a]">เหตุผล: {cur.decline_reason}</p>}
          {cur.resolution && typeof cur.resolution.dispute === "string" && <p className="m-0 rounded-lg px-3 py-2 text-[12.5px] text-[#fecaca] bg-[rgba(239,68,68,.1)]">แจ้งปัญหา: {cur.resolution.dispute}</p>}
          {cur.resolution && cur.resolution.decided ? <p className="m-0 text-[12.5px] text-[#cdbfb3]">ตัดสินแล้ว: {String(cur.resolution.decided)} {cur.resolution.refund_pct != null ? `คืน ${String(cur.resolution.refund_pct)}%` : ""} · {String(cur.resolution.note ?? "")}</p> : null}
          {["cancel_requested", "disputed"].includes(cur.status) && (
            <div className="flex flex-col gap-2 rounded-xl border p-2.5" style={{ borderColor: LINE }}>
              <b>ตัดสิน</b>
              <label className="flex items-center gap-2">คืนลูกค้า<input type="number" min={0} max={100} value={pct} onChange={(e) => setPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className="w-20 h-9 rounded-lg bg-[#130e0e] border px-2" style={{ borderColor: LINE }} />% = {baht(Math.round(cur.total_satang * pct / 100))}</label>
              <div className="flex gap-1">{[100, 50, 0].map((v) => <button key={v} type="button" onClick={() => setPct(v)} className="h-8 px-3 rounded-full border text-[12px]" style={{ borderColor: pct === v ? GOLD : LINE, color: pct === v ? GOLD : "#d3c7bc" }}>{v}%</button>)}</div>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เหตุผล/บันทึก (บังคับ · ลูกค้าเห็น)" className="h-10 rounded-lg bg-[#130e0e] border px-2.5" style={{ borderColor: LINE }} />
              <span className="text-[11.5px] text-[#7d6d6a]">ส่วนที่ไม่คืนแบ่งให้ Part-Time ตามขั้นส่วนแบ่ง · ส่วนที่เหลือเป็นรายได้บริษัท</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button disabled={busy || !note.trim()} onClick={() => resolve("reject")} className="h-9 rounded-full border text-[#d3c7bc] disabled:opacity-40" style={{ borderColor: LINE }}>{cur.status === "cancel_requested" ? "ไม่ให้ยกเลิก" : "ยกคำร้อง"}</button>
                <button disabled={busy || !note.trim()} onClick={() => resolve("refund")} className="btn-red-lux h-9 rounded-full text-white font-semibold disabled:opacity-40">บันทึกผล</button>
              </div>
            </div>
          )}
        </>}
      </aside>
    </div>
  );
}
