"use client";

// งานเข้า (บอร์ด P-Incoming) + แชทกับลูกค้า — ใช้ข้อมูลการจองจริง (/api/pt/bookings)
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US");
type B = { id: string; code: string; status: string; starts_at: string; hours: number; total_satang: number; price_satang: number; place: { label: string; detail: string }; note: string | null; expires_at: string | null; customer_name: string | null; pt_done_at?: string | null };
const fmt = (iso: string) => new Date(iso).toLocaleString("th-TH", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const q = (mb: string, t: string) => `mb=${encodeURIComponent(mb)}${t ? `&t=${encodeURIComponent(t)}` : ""}`;

export function PtIncoming({ mb, t }: { mb: string; t: string }) {
  const [rows, setRows] = useState<B[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [reason, setReason] = useState<Record<string, string>>({});
  const [now, setNow] = useState(Date.now());
  const load = useCallback(() => fetch(`/api/pt/bookings?${q(mb, t)}`, { cache: "no-store" }).then((r) => r.json()).then((d) => (d?.ok ? setRows(d.bookings) : (setErr(d?.error || ""), setRows([])))).catch(() => setRows([])), [mb, t]);
  useEffect(() => { load(); const i = setInterval(() => { setNow(Date.now()); if (document.visibilityState === "visible") load(); }, 15000); return () => clearInterval(i); }, [load]);
  const act = async (id: string, accept: boolean) => {
    setBusy(id);
    const r = await fetch(`/api/pt/bookings/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t, accept, reason: reason[id] ?? "" }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy("");
    if (!d?.ok) setErr(d?.error || "บันทึกไม่สำเร็จ");
    load();
  };
  const act2 = async (id: string, action: "checkin" | "done") => {
    setBusy(id);
    const r = await fetch(`/api/pt/bookings/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t, action }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy("");
    if (!d?.ok) setErr(d?.error || "บันทึกไม่สำเร็จ");
    load();
  };
  const incoming = (rows ?? []).filter((b) => b.status === "requested");
  const upcoming = (rows ?? []).filter((b) => ["accepted", "checked_in", "cancel_requested"].includes(b.status));

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
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={!!busy} onClick={() => act(b.id, false)} className="h-12 rounded-[14px] text-[#f3ead9] disabled:opacity-50" style={{ border: `1px solid ${LN}` }}>ไม่สะดวก</button>
              <button type="button" disabled={!!busy} onClick={() => act(b.id, true)} className="h-12 rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold disabled:opacity-50">{busy === b.id ? "กำลังบันทึก…" : "รับงาน"}</button>
            </div>
          </div>
        );
      })}
      {!!upcoming.length && <h3 className="m-0 mt-2 text-[15px] font-medium">นัดที่ยืนยันแล้ว</h3>}
      {upcoming.map((b) => {
        const chat = `/join/profile/${mb}/chat/${b.id}${t ? `?t=${encodeURIComponent(t)}` : ""}`;
        const soon = Date.parse(b.starts_at) - now < 2 * 3600_000;
        return (
          <div key={b.id} className="rounded-[20px] bg-[#211a18] flex flex-col gap-2" style={{ padding: 14, border: `1px solid ${LN}` }}>
            <b className="font-medium">{fmt(b.starts_at)} · {b.hours} ชม.</b>
            <span className="text-[13px] font-light text-[#d9c9b4]">{b.place.label} {b.place.detail}{b.status === "cancel_requested" ? " · ลูกค้าขอยกเลิก รอทีมงาน" : b.status === "checked_in" ? " · ถึงจุดนัดแล้ว" : ""}</span>
            <div className="grid grid-cols-3 gap-2">
              {b.status === "accepted" && <button type="button" disabled={!!busy || !soon} onClick={() => act2(b.id, "checkin")} title={soon ? "" : "เช็กอินได้ก่อนเวลานัด 2 ชม."} className="h-11 rounded-xl bg-[#e8c472] text-[#1b130b] text-[13px] font-semibold disabled:opacity-40">ถึงจุดนัด</button>}
              {(b.status === "checked_in" || b.status === "accepted") && <button type="button" disabled={!!busy || b.status !== "checked_in" || !!b.pt_done_at} onClick={() => act2(b.id, "done")} className="h-11 rounded-xl text-[13px] font-semibold disabled:opacity-40" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>{b.pt_done_at ? "รอลูกค้ายืนยัน" : "จบงาน"}</button>}
              <Link href={chat} className="h-11 rounded-xl text-[13px] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9] col-start-3" style={{ border: `1px solid ${LN}` }}>แชท</Link>
            </div>
          </div>
        );
      })}
    </section>
  );
}

type M = { id: number; sender_type: "customer" | "parttime" | "system"; body: string; blocked: boolean; created_at: string };
export function PtChat({ mb, t, id }: { mb: string; t: string; id: string }) {
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
        {!ms.length && <div className="self-center text-[12px] font-light text-[#d9c9b4] text-center">คุยรายละเอียดนัดกับลูกค้า · ห้ามแลกเบอร์โทร LINE หรือช่องทางนอกแอป</div>}
        {ms.map((m) => m.sender_type === "system" ? <div key={m.id} className="self-center text-center text-[12px] font-light text-[#d9c9b4] rounded-xl bg-[#211a18]" style={{ padding: "6px 12px" }}>{m.body}</div>
          : m.sender_type === "parttime" ? <div key={m.id} className="self-end max-w-[76%] text-[15px]" style={{ background: m.blocked ? "rgba(201,40,61,.2)" : GOLD, color: m.blocked ? "#ff8a9a" : "#1b130b", borderRadius: "20px 20px 6px 20px", padding: "10px 14px" }}>{m.body}{m.blocked ? " · ไม่ถูกส่ง" : ""}</div>
          : <div key={m.id} className="self-start max-w-[76%] text-[15px] bg-[#251d1b]" style={{ borderRadius: "20px 20px 20px 6px", padding: "10px 14px" }}>{m.body}</div>)}
        <div ref={end} />
      </div>
      {warn && <p role="alert" className="m-0 px-4 pb-1 text-[12.5px] text-[#ff8a9a]">{warn}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="sticky bottom-[84px] lg:bottom-0 flex gap-2 items-center px-4 py-3" style={{ background: "#171211", borderTop: `1px solid ${LN}` }}>
        <input value={text} onChange={(e) => setText(e.target.value)} disabled={!open} maxLength={1000} placeholder={open ? "พิมพ์ข้อความ" : "แชทของนัดนี้ปิดแล้ว"} aria-label="พิมพ์ข้อความ" className="flex-1 min-w-0 h-[46px] rounded-full bg-[#211a18] px-4 text-[16px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]" style={{ border: `1px solid ${LN}` }} />
        <button type="submit" disabled={!text.trim() || !open} aria-label="ส่ง" className="w-[46px] h-[46px] rounded-full bg-[#e8c472] text-[#1b130b] grid place-items-center disabled:opacity-45"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg></button>
      </form>
    </div>
  );
}
