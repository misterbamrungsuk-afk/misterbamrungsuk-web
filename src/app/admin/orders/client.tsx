"use client";

// การจองทั้งหมด (ข้อมูลจริง) — กรองตามสถานะ · ค้นหา · ตัดสินคำขอยกเลิก / ข้อพิพาท (คืนลูกค้า % · ส่วนที่เหลือแบ่งตามปกติ) · แท็บผิดนัด
// canResolve = มีสิทธิ์การเงิน (/admin/wallet) — ไม่มี (เช่น cs) เห็นแผงตัดสินแบบอ่านอย่างเดียว (API ก็ปฏิเสธอยู่แล้ว)
import { useEffect, useMemo, useState } from "react";
import { useConfirm } from "../confirm";
import { NoShowClaims } from "./noshow-claims";
import { CallLog } from "@/components/call/call-log";

type Res = Record<string, unknown> | null;
type B = { id: string; code: string; status: string; customer_email: string | null; parttime_mb: string; parttime_nick: string | null; starts_at: string; hours: number; total_satang: number; place: { label: string; detail: string }; decline_reason: string | null; resolution: Res; created_at: string; checked_in_at?: string | null };
type Preview = { total: number; refund: number; pt: number; share_pct: number; room: number; revenue: number; back_to: string };
const GOLD = "#f0c75a";
const LINE = "rgba(240,200,90,.38)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US");
const ST: Record<string, [string, string]> = {
  requested: ["รอ Part-Time ตอบ", "#eed58a"], accepted: ["ยืนยันแล้ว", "#4ade80"], checked_in: ["ระหว่างนัด", "#4ade80"], completed: ["จบงาน", "#cdbfb3"],
  cancel_requested: ["ขอยกเลิก · รอตัดสิน", "#fca5a5"], disputed: ["ข้อพิพาท · รอตัดสิน", "#fca5a5"], declined: ["ปฏิเสธ", "#9a8a85"], expired: ["หมดเวลา", "#9a8a85"], cancelled: ["ยกเลิก", "#9a8a85"], refunded: ["คืนเงินแล้ว", "#9a8a85"],
};
/** ป้ายสถานะ — completed ที่มาจากยกเลิกคืน 0% / ผิดนัด ต้องไม่ขึ้นว่า "จบงาน" เฉย ๆ */
function stOf(b: B): [string, string] {
  const r = b.resolution ?? {};
  if (b.status === "disputed" && r.noshow) return ["แจ้งผิดนัด · รอตัดสิน", "#fca5a5"];
  if (r.decided === "noshow:customer_no_show") return ["ผิดนัด · ลูกค้าไม่มา", "#cdbfb3"];
  if (r.decided === "noshow:provider_no_show") return ["ผิดนัด · Part-Time ไม่มา", "#9a8a85"];
  if (r.decided === "refund" && r.cancelled) return Number(r.refund_pct ?? 0) === 0 ? ["ยกเลิก · ไม่คืนเงินตามกติกา", "#cdbfb3"] : Number(r.refund_pct) < 100 ? [`ยกเลิก · คืน ${String(r.refund_pct)}%`, "#cdbfb3"] : ["ยกเลิก · คืนเต็ม", "#9a8a85"];
  return ST[b.status] ?? [b.status, "#cdbfb3"];
}
const F: [string, string][] = [["todo", "รอตัดสิน"], ["noshow", "ผิดนัด"], ["live", "กำลังดำเนินการ"], ["completed", "จบงาน"], ["closed", "ยกเลิก/คืนเงิน"], ["all", "ทั้งหมด"]];
const match = (b: B, f: string) => f === "all" ? true : f === "todo" ? ["cancel_requested", "disputed"].includes(b.status) : f === "live" ? ["requested", "accepted", "checked_in"].includes(b.status) : f === "completed" ? b.status === "completed" : ["declined", "expired", "cancelled", "refunded"].includes(b.status);
const fmt = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" });

export default function AdminOrdersClient({ canResolve, initialTab }: { canResolve: boolean; initialTab?: string }) {
  const [rows, setRows] = useState<B[] | null>(null);
  const [err, setErr] = useState("");
  const [f, setF] = useState(F.some(([k]) => k === initialTab) ? initialTab! : "todo");
  const [qs, setQs] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [pct, setPct] = useState(100);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmUi, ask] = useConfirm();
  const load = () => fetch("/api/admin/bookings", { cache: "no-store" }).then((r) => r.json()).then((d) => (d?.ok ? setRows(d.bookings) : (setErr(d?.error || "โหลดไม่สำเร็จ"), setRows([])))).catch(() => setRows([]));
  useEffect(() => { load(); }, []);
  // ค้นหา: รหัสการจอง · อีเมลลูกค้า · MB/ชื่อเล่น Part-Time
  const needle = qs.trim().toLowerCase();
  const hit = (b: B) => !needle || [b.code, b.customer_email ?? "", b.parttime_mb, b.parttime_nick ?? ""].some((x) => x.toLowerCase().includes(needle));
  const shown = useMemo(() => (rows ?? []).filter((b) => match(b, f) && hit(b)), [rows, f, needle]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = (rows ?? []).find((b) => b.id === sel) ?? shown[0] ?? null;
  const [arr, setArr] = useState<{ arrival: { at: string; gps: { lat: number; lng: number } | null; accuracy: number | null; error: string | null; dist_m: number | null } | null; pin: { lat: number; lng: number } | null } | null>(null);
  useEffect(() => { setArr(null); if (cur) fetch(`/api/admin/bookings?arrival=${cur.id}`, { cache: "no-store" }).then((r) => r.json()).then((d) => d?.ok && setArr(d)).catch(() => {}); }, [cur?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const resolve = async (action: "refund" | "reject") => {
    if (!cur) return;
    // ยืนยันในหน้า พร้อมตัวเลขจริงจากเซิร์ฟเวอร์ (ลูกค้าได้คืน · Part-Time ได้)
    const p: Preview | null = await fetch(`/api/admin/bookings?preview=${cur.id}&pct=${pct}`, { cache: "no-store" }).then((r) => r.json()).then((d) => (d?.ok ? d.preview : null)).catch(() => null);
    const body = action === "reject"
      ? `${cur.status === "cancel_requested" ? "ไม่ให้ยกเลิก" : "ยกคำร้อง"} → นัดกลับเป็น "${p?.back_to === "checked_in" ? "ระหว่างนัด (เช็กอินแล้ว)" : "ยืนยันแล้ว"}"\nไม่มีการย้ายเงิน · แจ้งลูกค้าและ Part-Time\nบันทึก: ${note}`
      : p ? `ลูกค้าได้คืน ${baht(p.refund)} (${pct}% ของ ${baht(p.total)})\nPart-Time ได้ ${baht(p.pt)} (ส่วนแบ่ง ${p.share_pct}% ของยอดที่ไม่คืน)${p.room ? `\nค่าห้องสปา ${baht(p.room)}` : ""}\nรายได้บริษัท ${baht(p.revenue)}\nบันทึก: ${note}` : `คืนลูกค้า ${pct}% = ${baht(Math.round(cur.total_satang * pct / 100))}\nบันทึก: ${note}`;
    if (!(await ask({ title: `ยืนยันผลตัดสิน ${cur.code}`, body, ok: action === "reject" ? "ยืนยันยกคำร้อง" : "ยืนยันและย้ายเงิน", danger: action === "refund" }))) return;
    setBusy(true);
    const r = await fetch("/api/admin/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cur.id, action, refund_pct: pct, note }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false); setMsg(d.ok ? "บันทึกผลตัดสินแล้ว" : d.error ?? "บันทึกไม่สำเร็จ");
    if (d.ok) { setNote(""); load(); }
  };
  const isNoShow = !!(cur && cur.status === "disputed" && cur.resolution?.noshow);

  return (
    <div className="flex flex-col gap-3.5">
      {confirmUi}
      <div><div className="text-[11px] tracking-[2.5px] font-semibold" style={{ color: GOLD }}>BOOKINGS</div><h1 className="mt-0.5 font-lux font-bold text-2xl">การจอง · เงินพักไว้</h1></div>
      <div className="flex flex-wrap gap-1.5">
        {F.map(([k, l]) => { const n = k === "noshow" ? (rows ?? []).filter((b) => b.status === "disputed" && b.resolution?.noshow).length : (rows ?? []).filter((b) => match(b, k)).length; const on = f === k; return <button key={k} onClick={() => setF(k)} aria-pressed={on} className="h-10 px-3.5 rounded-full border text-[12.5px] font-semibold" style={{ borderColor: on ? GOLD : LINE, background: on ? GOLD : "transparent", color: on ? "#1a1206" : "#d3c7bc" }}>{l} {n}</button>; })}
      </div>
      {f === "noshow" ? <NoShowClaims onToast={(m) => { setMsg(m); load(); }} canDecide={canResolve} /> : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          <div className="flex-1 min-w-0 w-full flex flex-col gap-3.5">
            <input type="search" value={qs} onChange={(e) => setQs(e.target.value)} placeholder="ค้นหา: รหัสการจอง · อีเมลลูกค้า · MB / ชื่อเล่น Part-Time" aria-label="ค้นหาการจอง" className="h-11 rounded-xl bg-[#130e0e] border px-3.5 text-[14px]" style={{ borderColor: LINE }} />
            {err && <p className="text-sm text-[#fca5a5]">{err} · ต้องรัน supabase/booking/0001_booking.sql</p>}
            {msg && <p role="status" className="text-sm text-[#eed58a]">{msg}</p>}
            <div className="rounded-2xl border overflow-x-auto text-[13px]" style={{ borderColor: LINE }}>
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[100px_minmax(0,1.2fr)_110px_130px_100px_150px] px-3.5 py-2.5 bg-[#130e0e] text-[#9a8a85] text-xs"><span>รหัส</span><span>ลูกค้า → Part-Time</span><span>ยอด</span><span>เวลานัด</span><span>ชม.</span><span>สถานะ</span></div>
                {shown.map((b) => { const st = stOf(b); return (
                  <button key={b.id} onClick={() => { setSel(b.id); setMsg(""); }} className="w-full grid grid-cols-[100px_minmax(0,1.2fr)_110px_130px_100px_150px] px-3.5 py-[11px] border-t text-left items-center" style={{ borderColor: LINE, background: cur?.id === b.id ? "rgba(240,200,90,.16)" : "transparent" }}>
                    <span className="text-[#ffd76a]">{b.code}</span><span className="truncate pr-2">{b.customer_email} → {b.parttime_nick} ({b.parttime_mb})</span><span>{baht(b.total_satang)}</span><span>{fmt(b.starts_at)}</span><span>{b.hours}</span><span style={{ color: st[1] }}>{st[0]}</span>
                  </button>
                ); })}
                {rows !== null && !shown.length && <p className="border-t px-4 py-10 text-center text-[#9a8a85]" style={{ borderColor: LINE }}>{needle ? `ไม่พบ “${qs}” ในหมวดนี้` : "ไม่มีรายการในหมวดนี้"}</p>}
              </div>
            </div>
          </div>
          <aside className="w-full lg:w-[320px] shrink-0 p-[18px] rounded-[18px] border bg-[#241717] flex flex-col gap-2.5 text-[13px]" style={{ borderColor: "rgba(245,210,110,.85)" }}>
            {!cur ? <p className="py-10 text-center text-[#9a8a85]">เลือกการจอง</p> : <>
              <div className="font-lux font-semibold text-[17px]">{cur.code}</div>
              {[["สถานะ", stOf(cur)[0]], ["ลูกค้า", cur.customer_email ?? "-"], ["Part-Time", `${cur.parttime_nick} · ${cur.parttime_mb}`], ["เวลานัด", `${fmt(cur.starts_at)} · ${cur.hours} ชม.`], ["สถานที่", `${cur.place.label} ${cur.place.detail}`], ["ยอดรวม", baht(cur.total_satang)], ["จองเมื่อ", fmt(cur.created_at)], ...(cur.checked_in_at ? [["เช็กอิน", fmt(cur.checked_in_at)]] : [])].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><span className="text-[#cdbfb3] shrink-0">{k}</span><span className="text-right">{v}</span></div>)}
              {cur.decline_reason && <p className="m-0 text-[12.5px] text-[#eed58a]">เหตุผล: {cur.decline_reason}</p>}
              {arr?.pin && <div className="flex justify-between gap-3"><span className="text-[#cdbfb3] shrink-0">หมุดจุดนัด</span><a className="text-right underline" style={{ color: GOLD }} target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${arr.pin.lat},${arr.pin.lng}`}>{arr.pin.lat.toFixed(5)}, {arr.pin.lng.toFixed(5)}</a></div>}
              {arr?.arrival && <div className="flex justify-between gap-3"><span className="text-[#cdbfb3] shrink-0">ถึงจุดนัด</span><span className="text-right">{fmt(arr.arrival.at)} · {arr.arrival.gps ? <a className="underline" style={{ color: GOLD }} target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${arr.arrival.gps.lat},${arr.arrival.gps.lng}`}>GPS{arr.arrival.dist_m != null ? ` ห่างหมุด ${arr.arrival.dist_m < 1000 ? `${arr.arrival.dist_m} ม.` : `${(arr.arrival.dist_m / 1000).toFixed(1)} กม.`}` : ""}</a> : <span className="text-[#fca5a5]">ไม่มี GPS{arr.arrival.error ? ` (${arr.arrival.error})` : ""}</span>}</span></div>}
              {cur.resolution && typeof cur.resolution.dispute === "string" && <p className="m-0 rounded-lg px-3 py-2 text-[12.5px] text-[#fecaca] bg-[rgba(239,68,68,.1)]">แจ้งปัญหา: {cur.resolution.dispute}</p>}
              {cur.resolution && cur.resolution.decided ? <p className="m-0 text-[12.5px] text-[#cdbfb3]">ตัดสินแล้ว: {String(cur.resolution.decided)} {cur.resolution.refund_pct != null ? `คืน ${String(cur.resolution.refund_pct)}%` : ""} · {String(cur.resolution.note ?? "")}</p> : null}
              <CallLog bookingId={cur.id} />
              {isNoShow ? (
                <button type="button" onClick={() => setF("noshow")} className="h-10 rounded-full border text-[13px] font-semibold" style={{ borderColor: GOLD, color: GOLD }}>คำร้องผิดนัด · ตัดสินที่แท็บ “ผิดนัด” ›</button>
              ) : ["cancel_requested", "disputed"].includes(cur.status) && (
                <div className="flex flex-col gap-2 rounded-xl border p-2.5" style={{ borderColor: LINE }}>
                  <b>ตัดสิน</b>
                  {!canResolve && <p className="m-0 text-[12px] text-[#eed58a]">ดูได้อย่างเดียว · การตัดสินที่ย้ายเงินต้องใช้สิทธิ์ฝ่ายการเงิน</p>}
                  <fieldset disabled={!canResolve} className="flex flex-col gap-2 disabled:opacity-50">
                    <label className="flex items-center gap-2">คืนลูกค้า<input type="number" min={0} max={100} value={pct} onChange={(e) => setPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className="w-20 h-10 rounded-lg bg-[#130e0e] border px-2" style={{ borderColor: LINE }} />% = {baht(Math.round(cur.total_satang * pct / 100))}</label>
                    <div className="flex gap-1">{[100, 50, 0].map((v) => <button key={v} type="button" onClick={() => setPct(v)} className="h-10 px-3 rounded-full border text-[12px]" style={{ borderColor: pct === v ? GOLD : LINE, color: pct === v ? GOLD : "#d3c7bc" }}>{v}%</button>)}</div>
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เหตุผล/บันทึก (บังคับ · ลูกค้าเห็น)" className="h-10 rounded-lg bg-[#130e0e] border px-2.5" style={{ borderColor: LINE }} />
                    <span className="text-[11.5px] text-[#9a8a85]">ส่วนที่ไม่คืนแบ่งให้ Part-Time ตามขั้นส่วนแบ่ง · ส่วนที่เหลือเป็นรายได้บริษัท · กดแล้วจะแสดงตัวเลขให้ยืนยันอีกครั้ง</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button disabled={busy || !note.trim()} onClick={() => resolve("reject")} className="h-10 rounded-full border text-[#d3c7bc] disabled:opacity-40" style={{ borderColor: LINE }}>{cur.status === "cancel_requested" ? "ไม่ให้ยกเลิก" : "ยกคำร้อง"}</button>
                      <button disabled={busy || !note.trim()} onClick={() => resolve("refund")} className="btn-red-lux h-10 rounded-full text-white font-semibold disabled:opacity-40">บันทึกผล</button>
                    </div>
                  </fieldset>
                </div>
              )}
            </>}
          </aside>
        </div>
      )}
    </div>
  );
}
