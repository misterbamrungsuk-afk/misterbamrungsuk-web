"use client";

// งานเข้า (บอร์ด P-Incoming) + แชทกับลูกค้า — ใช้ข้อมูลการจองจริง (/api/pt/bookings)
import { useCallback, useEffect, useRef, useState } from "react";
import { TravelShare } from "./travel-share";
import { CallButton } from "@/components/call/call-button";
import { NoShowReport } from "./noshow-report";
import { ChatNotice } from "@/components/chat-notice";
import Link from "next/link";
import { BOOKING_STATUS_TH } from "@/lib/join/pt-ui";

const GOLD = "#e8c472";
/** อีเวนต์ในหน้า: รับเรียกด่วนแล้ว → ให้รายการงานโหลดใหม่ทันที */
const JOBS_RELOAD = "pt:jobs-reload";
const LN = "rgba(243,234,217,0.07)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US");
type Chg = { id: string; kind: "reschedule" | "extend"; old_starts_at: string | null; new_starts_at: string | null; hours: number; amount_satang: number; reason: string | null; expires_at: string };
type B = { id: string; code: string; status: string; starts_at: string; hours: number; total_satang: number; price_satang: number; place: { label: string; detail: string; lat?: number; lng?: number }; note: string | null; expires_at: string | null; customer_name: string | null; pt_done_at?: string | null; pending_change?: Chg | null; extra_hours?: number };
const hrs = (b: B) => b.hours + (b.extra_hours ?? 0);
const fmt = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const q = (mb: string, t: string) => `mb=${encodeURIComponent(mb)}${t ? `&t=${encodeURIComponent(t)}` : ""}`;

export function PtIncoming({ mb, t }: { mb: string; t: string }) {
  const [rows, setRows] = useState<B[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [reason, setReason] = useState<Record<string, string>>({});
  const [now, setNow] = useState(Date.now());
  const load = useCallback(() => fetch(`/api/pt/bookings?${q(mb, t)}`, { cache: "no-store" }).then((r) => r.json()).then((d) => (d?.ok ? setRows(d.bookings) : (setErr(d?.error || ""), setRows([])))).catch(() => setRows([])), [mb, t]);
  useEffect(() => { load(); const i = setInterval(() => { setNow(Date.now()); if (document.visibilityState === "visible") load(); }, 15000); return () => clearInterval(i); }, [load]);
  // รับเรียกด่วนสำเร็จ (PtQuick) → โหลดรายการใหม่ทันที ไม่ต้องรอรอบ 15 วิ
  useEffect(() => { const f = () => load(); window.addEventListener(JOBS_RELOAD, f); return () => window.removeEventListener(JOBS_RELOAD, f); }, [load]);
  const [ask, setAsk] = useState(""); // id งานที่กำลังยืนยัน "ไม่สะดวก"
  const act = async (id: string, accept: boolean) => {
    setBusy(id); setAsk("");
    const r = await fetch(`/api/pt/bookings/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t, accept, reason: reason[id] ?? "" }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy("");
    if (!d?.ok) setErr(d?.error || "บันทึกไม่สำเร็จ");
    load();
  };
  const act2 = async (id: string, action: "checkin" | "done") => {
    setBusy(id);
    // ถึงจุดนัด: แนบ GPS ตอนนี้ (รอสูงสุด 6 วิ) เป็นหลักฐานว่ามาถึงจริง
    const gps = action !== "checkin" || !navigator.geolocation ? undefined : await new Promise<Record<string, unknown>>((ok) => navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }), (e) => ok({ error: e.code === 1 ? "ไม่อนุญาตตำแหน่ง" : "จับ GPS ไม่ได้" }), { enableHighAccuracy: true, timeout: 6000, maximumAge: 60_000 }));
    const r = await fetch(`/api/pt/bookings/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t, action, gps }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy("");
    if (!d?.ok) setErr(d?.error || "บันทึกไม่สำเร็จ");
    load();
  };
  // ตอบคำขอเปลี่ยนเวลา / ต่อเวลาของลูกค้า
  const [chAsk, setChAsk] = useState(""); // id งานที่กำลังยืนยัน "ไม่สะดวก" คำขอเปลี่ยนแปลง
  const act3 = async (id: string, action: "reschedule_accept" | "reschedule_decline" | "extend_accept" | "extend_decline") => {
    setBusy(id); setChAsk(""); setErr("");
    const r = await fetch(`/api/pt/bookings/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t, action, reason: reason[id] ?? "" }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy("");
    if (!d?.ok) setErr(d?.error || "บันทึกไม่สำเร็จ");
    load();
  };
  const byStart = (a: B, b: B) => a.starts_at.localeCompare(b.starts_at);
  const incoming = (rows ?? []).filter((b) => b.status === "requested").sort(byStart);
  const upcoming = (rows ?? []).filter((b) => ["accepted", "checked_in", "cancel_requested"].includes(b.status)).sort(byStart);
  const disputed = (rows ?? []).filter((b) => b.status === "disputed").sort(byStart);
  // ประวัติงาน: ใหม่ → เก่า
  const history = (rows ?? []).filter((b) => ["completed", "declined", "expired", "cancelled", "refunded"].includes(b.status)).sort((a, b) => b.starts_at.localeCompare(a.starts_at));

  return (
    <section className="flex flex-col gap-3 px-4 pb-4">
      <div className="flex justify-between items-baseline"><h2 className="m-0 text-[18px] font-medium">งานเข้า</h2><span className="text-[13px] font-light" style={{ color: GOLD }}>{incoming.length} งาน</span></div>
      {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
      {rows === null ? <p className="m-0 text-[13px] font-light text-[#b5a596]">กำลังโหลด…</p> : !incoming.length && !upcoming.length ? (
        <div className="rounded-[20px] bg-[#272013] text-[14px] font-light text-[#d9c9b4]" style={{ padding: "16px 14px" }}>ยังไม่มีงานเข้า · เปิดรับงานและอัปเดตวันเวลาว่างไว้ ลูกค้าจะจองได้ทันที</div>
      ) : null}
      {incoming.map((b) => {
        const left = b.expires_at ? Math.max(0, Math.round((Date.parse(b.expires_at) - now) / 60000)) : 0;
        return (
          <div key={b.id} className="rounded-[20px] bg-[#211a18] flex flex-col gap-2 text-[14px]" style={{ padding: 14, border: `1.5px solid ${GOLD}` }}>
            <div className="flex justify-between items-center"><b className="font-semibold text-[16px]">{b.place.label} · {b.hours} ชม.</b><span className="text-[12px] font-semibold rounded-full" style={{ padding: "3px 10px", background: "rgba(232,196,114,0.14)", color: GOLD }}>ตอบภายใน {left} นาที</span></div>
            <div className="text-[#d9c9b4]">{fmt(b.starts_at)}</div>
            <div className="text-[#d9c9b4]">{b.place.detail}</div>
            {b.note && <div className="rounded-xl bg-[#251d1b] text-[13px]" style={{ padding: "8px 12px" }}>ลูกค้าฝากบอก: {b.note}</div>}
            <div className="flex justify-between"><span className="text-[#d9c9b4]">ค่าบริการ</span><b style={{ color: GOLD }}>{baht(b.price_satang)}</b></div>
            <input value={reason[b.id] ?? ""} onChange={(e) => setReason({ ...reason, [b.id]: e.target.value })} maxLength={200} placeholder="เหตุผลถ้าไม่สะดวก (ไม่บังคับ)" className="h-11 rounded-xl bg-[#251d1b] px-3 text-[15px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]" />
            {ask === b.id ? (
              // ยืนยันในหน้า (ไม่ใช้ window.confirm) + เตือนกติกาการปฏิเสธงานตามสัญญา
              <div role="dialog" aria-label="ยืนยันไม่สะดวกรับงาน" className="rounded-[14px] flex flex-col gap-2" style={{ padding: 12, background: "rgba(240,163,90,.1)", border: "1px solid rgba(240,163,90,.5)" }}>
                <b className="font-semibold text-[15px]">ยืนยันว่าไม่สะดวกรับงานนี้?</b>
                <span className="text-[13px] font-light text-[#f6c38e] leading-[1.55]">ตามสัญญา Part-Time ไม่ควรปฏิเสธลูกค้าโดยไม่มีเหตุอันควร · ปฏิเสธบ่อยมีผลต่ออันดับโปรไฟล์และการคืนค่าการันตี · ลูกค้าได้เงินคืนเต็มจำนวนทันที</span>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setAsk("")} className="h-11 rounded-xl text-[14px] font-semibold" style={{ background: "rgba(243,234,217,0.1)" }}>กลับไปก่อน</button>
                  <button type="button" disabled={!!busy} onClick={() => act(b.id, false)} className="h-11 rounded-xl text-[14px] font-semibold text-white disabled:opacity-50" style={{ background: "#a3283c" }}>{busy === b.id ? "กำลังบันทึก…" : "ยืนยันไม่สะดวก"}</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={!!busy} onClick={() => setAsk(b.id)} className="h-12 rounded-[14px] text-[#f3ead9] disabled:opacity-50" style={{ border: `1px solid ${LN}` }}>ไม่สะดวก</button>
                <button type="button" disabled={!!busy} onClick={() => act(b.id, true)} className="h-12 rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold disabled:opacity-50">{busy === b.id ? "กำลังบันทึก…" : "รับงาน"}</button>
              </div>
            )}
          </div>
        );
      })}
      {!!upcoming.length && <h3 className="m-0 mt-2 text-[15px] font-medium">นัดที่ยืนยันแล้ว</h3>}
      {upcoming.map((b) => {
        const chat = `/join/profile/${mb}/chat/${b.id}${t ? `?t=${encodeURIComponent(t)}` : ""}`;
        const soon = Date.parse(b.starts_at) - now < 2 * 3600_000;
        const started = Date.parse(b.starts_at) <= now;
        const hm = new Date(b.starts_at).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
        // ปุ่มที่กดไม่ได้ต้องบอกเหตุผลเป็นตัวอักษร (ไม่ใช่แค่ title) — ตรงกับกติกาฝั่งเซิร์ฟเวอร์ (checkIn / ptDone)
        const why = b.status === "accepted" ? (!soon ? "เช็กอินได้ตั้งแต่ 2 ชม. ก่อนนัด · จบงานได้หลังเช็กอินและถึงเวลานัด" : "กด \"ถึงจุดนัด\" เมื่อถึงที่นัด แล้วจึงจบงานได้")
          : b.status === "checked_in" && !b.pt_done_at && !started ? `จบงานได้ตั้งแต่เวลานัด ${hm} น.`
          : b.pt_done_at ? "แจ้งจบงานแล้ว · รอลูกค้ายืนยันและรีวิว" : "";
        return (
          <div key={b.id} className="rounded-[20px] bg-[#211a18] flex flex-col gap-2" style={{ padding: 14, border: `1px solid ${b.pending_change ? GOLD : LN}` }}>
            <b className="font-medium">{fmt(b.starts_at)} · {hrs(b)} ชม.{b.extra_hours ? <span className="text-[12px] font-light text-[#d9c9b4]"> (ต่อเวลา {b.extra_hours} ชม.)</span> : null}</b>
            <span className="text-[13px] font-light text-[#d9c9b4]">{b.place.label} {b.place.detail}{b.status === "cancel_requested" ? " · ลูกค้าขอยกเลิก รอทีมงาน" : b.status === "checked_in" ? " · ถึงจุดนัดแล้ว" : ""}</span>
            {b.pending_change && (() => {
              const c = b.pending_change;
              const re = c.kind === "reschedule";
              return (
                <div role="group" aria-label={re ? "คำขอเปลี่ยนเวลา" : "คำขอต่อเวลา"} className="rounded-[14px] flex flex-col gap-2" style={{ padding: 12, background: "rgba(232,196,114,0.08)", border: "1px solid rgba(232,196,114,.45)" }}>
                  <b className="font-semibold text-[14.5px]">{re ? "ลูกค้าขอเปลี่ยนเวลานัด" : "ลูกค้าขอต่อเวลา +1 ชม."}</b>
                  <span className="text-[13px] font-light text-[#d9c9b4] leading-[1.55]">{re ? <>{fmt(c.old_starts_at ?? b.starts_at)} → <b className="font-semibold text-[#f3ead9]">{fmt(c.new_starts_at!)}</b>{c.reason ? ` · ${c.reason}` : ""}</> : <>ค่าบริการเพิ่ม <b className="font-semibold" style={{ color: GOLD }}>{baht(c.amount_satang)}</b> · ได้ส่วนแบ่งตามปกติเมื่อจบงาน</>}</span>
                  <span className="text-[12px] font-light text-[#b5a596]">ตอบได้ถึง {fmt(c.expires_at)} · ไม่ตอบ = {re ? "นัดคงเวลาเดิม" : "ไม่ต่อเวลา"}</span>
                  {chAsk === b.id ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setChAsk("")} className="h-11 rounded-xl text-[13px] font-semibold" style={{ background: "rgba(243,234,217,0.1)" }}>กลับไปก่อน</button>
                      <button type="button" disabled={!!busy} onClick={() => act3(b.id, re ? "reschedule_decline" : "extend_decline")} className="h-11 rounded-xl text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: "#a3283c" }}>{busy === b.id ? "กำลังบันทึก…" : "ยืนยันไม่สะดวก"}</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" disabled={!!busy} onClick={() => setChAsk(b.id)} className="h-11 rounded-xl text-[13px] text-[#f3ead9] disabled:opacity-50" style={{ border: `1px solid ${LN}` }}>ไม่สะดวก</button>
                      <button type="button" disabled={!!busy} onClick={() => act3(b.id, re ? "reschedule_accept" : "extend_accept")} className="h-11 rounded-xl bg-[#e8c472] text-[#1b130b] text-[13px] font-semibold disabled:opacity-50">{busy === b.id ? "กำลังบันทึก…" : re ? "รับเวลาใหม่" : "รับต่อเวลา"}</button>
                    </div>
                  )}
                </div>
              );
            })()}
            {b.status === "accepted" && <TravelShare mb={mb} t={t} id={b.id} startsAt={b.starts_at} dest={b.place} />}
            {(b.status === "accepted" || b.status === "checked_in") && <CallButton bookingId={b.id} who="pt" mb={mb} t={t ?? undefined} peerName="ลูกค้า" />}
            <div className="grid grid-cols-3 gap-2">
              {b.status === "accepted" && <button type="button" disabled={!!busy || !soon} onClick={() => act2(b.id, "checkin")} className="h-11 rounded-xl bg-[#e8c472] text-[#1b130b] text-[13px] font-semibold disabled:opacity-40">ถึงจุดนัด</button>}
              {(b.status === "checked_in" || b.status === "accepted") && <button type="button" disabled={!!busy || b.status !== "checked_in" || !!b.pt_done_at || !started} onClick={() => act2(b.id, "done")} className="h-11 rounded-xl text-[13px] font-semibold disabled:opacity-40" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>{b.pt_done_at ? "รอลูกค้ายืนยัน" : "จบงาน"}</button>}
              <Link href={chat} className="h-11 rounded-xl text-[13px] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9] col-start-3" style={{ border: `1px solid ${LN}` }}>แชท</Link>
            </div>
            {why && b.status !== "cancel_requested" && <span className="text-[12px] font-light text-[#b5a596] leading-[1.5]">{why}</span>}
            {b.status === "checked_in" && <NoShowReport mb={mb} t={t} id={b.id} onDone={load} />}
          </div>
        );
      })}
      {!!disputed.length && <h3 className="m-0 mt-2 text-[15px] font-medium">อยู่ระหว่างตรวจสอบ</h3>}
      {disputed.map((b) => (
        <div key={b.id} className="rounded-[20px] flex flex-col gap-1.5" style={{ padding: 14, background: "rgba(240,163,90,.08)", border: "1px solid rgba(240,163,90,.55)" }}>
          <div className="flex justify-between items-center gap-2"><b className="font-medium">{fmt(b.starts_at)} · {b.hours} ชม.</b><span className="text-[12px] font-semibold text-[#f6c38e] shrink-0">{b.code}</span></div>
          <span className="text-[13.5px] font-semibold text-[#f6c38e]">อยู่ระหว่างตรวจสอบโดยทีมงาน</span>
          <span className="text-[13px] font-light text-[#d9c9b4]">ลูกค้าแจ้งปัญหาของนัดนี้ · เงินพักไว้จนทีมงานตัดสิน (ปกติภายใน 48 ชม.) · มีข้อมูลเพิ่ม แจ้งทีมงานทาง LINE</span>
          <NoShowReport mb={mb} t={t} id={b.id} onDone={load} />
        </div>
      ))}
      {!!history.length && (
        <details className="mt-2 rounded-[20px] bg-[#211a18]" style={{ border: `1px solid ${LN}` }}>
          <summary className="list-none cursor-pointer min-h-12 flex items-center justify-between text-[15px] font-medium [&::-webkit-details-marker]:hidden" style={{ padding: "0 14px" }}>ประวัติงาน<span className="text-[13px] font-light" style={{ color: GOLD }}>{history.length} งาน ›</span></summary>
          <div className="flex flex-col" style={{ padding: "0 14px 8px" }}>
            {history.map((b) => {
              const [label, color] = BOOKING_STATUS_TH[b.status] ?? [b.status, "#b5a596"];
              return (
                <div key={b.id} className="flex justify-between items-center gap-3 text-[14px]" style={{ padding: "10px 0", borderTop: `1px solid ${LN}` }}>
                  <span className="flex flex-col min-w-0"><span className="truncate">{fmt(b.starts_at)} · {b.hours} ชม.</span><span className="text-[12px] font-light text-[#b5a596] truncate">{b.code} · {b.place.label}</span></span>
                  <span className="flex flex-col items-end shrink-0"><span className="tabular-nums font-semibold">{baht(b.price_satang)}</span><span className="text-[12px]" style={{ color }}>{label}</span></span>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </section>
  );
}

type M ={ id: number; sender_type: "customer" | "parttime" | "system"; body: string; blocked: boolean; created_at: string };
export function PtChat({ mb, t, id, quick = [] }: { mb: string; t: string; id: string; /** ข้อความตอบกลับเร็วที่บันทึกไว้ (หน้าตั้งค่า) */ quick?: string[] }) {
  const [ms, setMs] = useState<M[]>([]);
  const [text, setText] = useState("");
  const [warn, setWarn] = useState("");
  const [status, setStatus] = useState("");
  const last = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  const poll = useCallback(async () => {
    const r = await fetch(`/api/bookings/${id}/messages?after=${last.current}&${q(mb, t)}`, { cache: "no-store" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!d?.ok) return;
    setStatus(d.status);
    if (d.messages.length) { last.current = d.messages[d.messages.length - 1].id; setMs((x) => [...x, ...d.messages.filter((m: M) => !x.some((y) => y.id === m.id))]); }
  }, [id, mb, t]);
  useEffect(() => { poll(); const i = setInterval(() => { if (document.visibilityState === "visible") poll(); }, 4000); return () => clearInterval(i); }, [poll]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [ms.length]);
  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setWarn("");
    const r = await fetch(`/api/bookings/${id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, mb, t }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!d?.ok) return setWarn(d?.error || "ส่งไม่สำเร็จ");
    setText(""); if (d.warning) setWarn(d.warning);
    last.current = Math.max(last.current, d.message.id); setMs((x) => [...x, d.message]);
  };
  const open = !status || ["requested", "accepted", "checked_in", "cancel_requested"].includes(status);
  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 160px)" }}>
      <div className="flex-1 flex flex-col gap-2 px-4 py-3">
        <ChatNotice />
        {!ms.length && <div className="self-center text-[12px] font-light text-[#d9c9b4] text-center">คุยรายละเอียดนัดกับลูกค้า</div>}
        {ms.map((m) => m.sender_type === "system" ? <div key={m.id} className="self-center text-center text-[12px] font-light text-[#d9c9b4] rounded-xl bg-[#211a18]" style={{ padding: "6px 12px" }}>{m.body}</div>
          : m.sender_type === "parttime" ? <div key={m.id} className="self-end max-w-[76%] text-[15px]" style={{ background: m.blocked ? "rgba(201,40,61,.2)" : GOLD, color: m.blocked ? "#ff8a9a" : "#1b130b", borderRadius: "20px 20px 6px 20px", padding: "10px 14px" }}>{m.body}{m.blocked ? " · ไม่ถูกส่ง" : ""}</div>
          : <div key={m.id} className="self-start max-w-[76%] text-[15px] bg-[#251d1b]" style={{ borderRadius: "20px 20px 20px 6px", padding: "10px 14px" }}>{m.body}</div>)}
        <div ref={end} />
      </div>
      {warn && <p role="alert" className="m-0 px-4 pb-1 text-[12.5px] text-[#ff8a9a]">{warn}</p>}
      {/* ชิปข้อความตอบกลับเร็ว — แตะแล้วใส่ลงช่องพิมพ์ (แก้ก่อนส่งได้) */}
      {open && !!quick.length && (
        <div className="sticky bottom-[154px] lg:bottom-[70px] flex gap-2 overflow-x-auto px-4 py-2" style={{ background: "#171211" }} aria-label="ข้อความตอบกลับเร็ว">
          {quick.map((qr) => <button key={qr} type="button" onClick={() => setText((x) => (x.trim() ? `${x.trim()} ${qr}` : qr).slice(0, 1000))} className="shrink-0 min-h-10 max-w-[240px] truncate rounded-full text-[13px] text-[#e8c472] px-3.5" style={{ background: "rgba(232,196,114,0.14)", border: "1px solid rgba(232,196,114,0.35)" }}>{qr}</button>)}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="sticky bottom-[84px] lg:bottom-0 flex gap-2 items-center px-4 py-3" style={{ background: "#171211", borderTop: `1px solid ${LN}` }}>
        <input value={text} onChange={(e) => setText(e.target.value)} disabled={!open} maxLength={1000} placeholder={open ? "พิมพ์ข้อความ" : "แชทของนัดนี้ปิดแล้ว"} aria-label="พิมพ์ข้อความ" className="flex-1 min-w-0 h-[46px] rounded-full bg-[#211a18] px-4 text-[16px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]" style={{ border: `1px solid ${LN}` }} />
        <button type="submit" disabled={!text.trim() || !open} aria-label="ส่ง" className="w-[46px] h-[46px] rounded-full bg-[#e8c472] text-[#1b130b] grid place-items-center disabled:opacity-45"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg></button>
      </form>
    </div>
  );
}

type JP = { id: string; activity: string; starts_at: string; hours: number; area: string; note: string | null; expires_at: string; interested: boolean };
/** โพสต์หาเพื่อนของลูกค้า (บอร์ด C-JobPost) — Part-Time กดสนใจพร้อมข้อความสั้น ๆ */
export function PtPosts({ mb, t }: { mb: string; t: string }) {
  const [rows, setRows] = useState<JP[] | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const load = useCallback(() => fetch(`/api/pt/posts?${q(mb, t)}`, { cache: "no-store" }).then((r) => r.json()).then((d) => setRows(d?.ok ? d.posts : [])).catch(() => setRows([])), [mb, t]);
  useEffect(() => { load(); }, [load]);
  const interest = async (id: string) => {
    setBusy(id); setErr("");
    const r = await fetch("/api/pt/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t, post_id: id, message: msg[id] ?? "" }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy("");
    if (!d?.ok) setErr(d?.error || "ส่งไม่สำเร็จ");
    load();
  };
  if (!rows?.length) return null;
  return (
    <section className="flex flex-col gap-3 px-4 pb-4">
      <div className="flex justify-between items-baseline"><h2 className="m-0 text-[18px] font-medium">ลูกค้าโพสต์หาเพื่อน</h2><span className="text-[13px] font-light" style={{ color: GOLD }}>{rows.length} โพสต์</span></div>
      {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
      {rows.map((p) => (
        <div key={p.id} className="rounded-[20px] bg-[#211a18] flex flex-col gap-2 text-[14px]" style={{ padding: 14, border: `1px solid ${LN}` }}>
          <b className="font-semibold">{p.activity} · {fmt(p.starts_at)} · {p.hours} ชม.</b>
          <span className="text-[13px] font-light text-[#d9c9b4]">{p.area}{p.note ? ` · ${p.note}` : ""}</span>
          {p.interested ? <span className="text-[13px] font-semibold text-[#7fd6a3]">ส่งความสนใจแล้ว · รอลูกค้าเลือก</span> : <>
            <input value={msg[p.id] ?? ""} onChange={(e) => setMsg({ ...msg, [p.id]: e.target.value })} maxLength={120} placeholder="แนะนำตัวสั้น ๆ (ห้ามใส่ช่องทางติดต่อ)" className="h-11 rounded-xl bg-[#251d1b] px-3 text-[15px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]" />
            <button type="button" disabled={busy === p.id} onClick={() => interest(p.id)} className="h-11 rounded-xl bg-[#e8c472] text-[#1b130b] font-semibold disabled:opacity-50">{busy === p.id ? "กำลังส่ง…" : "สนใจ"}</button>
          </>}
        </div>
      ))}
    </section>
  );
}

/** เรียกด่วนที่เชิญเราอยู่ (บอร์ด C-QuickCall ฝั่งเพื่อน) — คนแรกที่กดรับได้นัด · ดึงใหม่ทุก 5 วิ */
type QC = { id: string; code: string; activity: string; hours: number; place: { label: string; detail: string }; note: string | null; price_satang: number; expires_at: string };
export function PtQuick({ mb, t }: { mb: string; t: string }) {
  const [rows, setRows] = useState<QC[]>([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string; href?: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const load = useCallback(() => fetch(`/api/pt/quick?${q(mb, t)}`, { cache: "no-store" }).then((r) => r.json()).then((d) => d?.ok && setRows(d.calls)).catch(() => {}), [mb, t]);
  useEffect(() => { load(); const i = setInterval(() => { setNow(Date.now()); if (document.visibilityState === "visible") load(); }, 5000); return () => clearInterval(i); }, [load]);
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const accept = async (id: string) => {
    setBusy(id); setMsg(null);
    const r = await fetch("/api/pt/quick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t, id }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy("");
    if (d?.ok) window.dispatchEvent(new Event(JOBS_RELOAD));
    setMsg(d?.ok ? { ok: true, text: `ได้นัดแล้ว ${d.booking.code} · เริ่ม ${new Date(d.booking.starts_at).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })} น.`, href: `/join/profile/${mb}/chat/${d.booking.id}${t ? `?t=${encodeURIComponent(t)}` : ""}` } : { ok: false, text: d?.error || "รับนัดไม่สำเร็จ" });
    load();
  };
  const live = rows.filter((r) => Date.parse(r.expires_at) > now);
  if (!live.length && !msg) return null;
  return (
    <section className="flex flex-col gap-3 px-4 pb-4">
      {msg && <p role="status" className="m-0 rounded-xl text-[13px]" style={{ padding: "10px 14px", background: msg.ok ? "rgba(95,208,143,.12)" : "rgba(201,40,61,.14)", color: msg.ok ? "#5fd08f" : "#ff8a9a" }}>{msg.text}{msg.href && <> · <Link href={msg.href} style={{ color: GOLD }}>แชทกับลูกค้า ›</Link></>}</p>}
      {live.map((c) => {
        const left = Math.max(0, Math.round((Date.parse(c.expires_at) - now) / 1000));
        return (
          <div key={c.id} className="rounded-[20px] flex flex-col gap-2" style={{ padding: 16, border: `1px solid ${GOLD}`, background: "linear-gradient(135deg, rgba(232,196,114,.14), #211a18)" }}>
            <div className="flex items-center gap-2"><span className="h-6 px-2.5 rounded-full text-[11.5px] font-semibold grid place-items-center text-[#1b130b]" style={{ background: GOLD }}>🔔 เรียกด่วน</span><span className="ml-auto text-[13px] tabular-nums" style={{ color: left < 30 ? "#ff8a9a" : GOLD }} aria-live="polite">เหลือ {left >= 60 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : `${left} วิ`}</span></div>
            <b className="text-[17px] font-medium">{c.activity} · {c.hours} ชม.</b>
            <span className="text-[13.5px] font-light text-[#d9c9b4]">{c.place.label} · {c.place.detail} · เริ่มราว 1 ชม. หลังรับ{c.note ? ` · ${c.note}` : ""}</span>
            <div className="flex items-center justify-between gap-3 pt-1">
              <b className="text-[18px]" style={{ color: GOLD }}>{baht(c.price_satang)}</b>
              <button type="button" onClick={() => accept(c.id)} disabled={!!busy} className="h-11 px-6 rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold disabled:opacity-50">{busy === c.id ? "กำลังรับ…" : "รับนัด"}</button>
            </div>
            <span className="text-[11.5px] font-light text-[#b5a596]">เพื่อนคนแรกที่กดรับได้นัด · เงินลูกค้าพักไว้กับเราแล้ว</span>
          </div>
        );
      })}
    </section>
  );
}
