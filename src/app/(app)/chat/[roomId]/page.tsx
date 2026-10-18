"use client";
/* eslint-disable @next/next/no-img-element */

// บอร์ด C-ChatRoom "ห้องแชท" — ผูกกับการจอง (roomId = booking id) · ดึงข้อความใหม่ทุก 4 วิ · กันเบอร์/LINE/ลิงก์
import { use, useCallback, useEffect, useRef, useState } from "react";
import { ChatNotice } from "@/components/chat-notice";
import { CallButton } from "@/components/call/call-button";
import Link from "next/link";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US");
type M = { id: number; sender_type: "customer" | "parttime" | "system"; body: string; blocked: boolean; created_at: string };
type B = { id: string; code: string; status: string; starts_at: string; hours: number; total_satang: number; place: { label: string }; pt: { nick: string; img: string; pid: string } };
const time = (iso: string) => new Date(iso).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

export default function ChatRoom({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [b, setB] = useState<B | null>(null);
  const [ms, setMs] = useState<M[]>([]);
  const [text, setText] = useState("");
  const [warn, setWarn] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const last = useRef(0);
  const end = useRef<HTMLDivElement>(null);

  const poll = useCallback(async () => {
    const r = await fetch(`/api/bookings/${roomId}/messages?after=${last.current}`, { cache: "no-store" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!d?.ok) return;
    if (d.messages.length) { last.current = d.messages[d.messages.length - 1].id; setMs((x) => [...x, ...d.messages.filter((m: M) => !x.some((y) => y.id === m.id))]); }
  }, [roomId]);
  useEffect(() => {
    fetch(`/api/bookings/${roomId}`, { cache: "no-store" }).then((r) => r.json()).then((d) => (d?.ok ? setB(d.booking) : setErr("ไม่พบห้องแชทนี้"))).catch(() => setErr("โหลดไม่สำเร็จ"));
    poll();
    const t = setInterval(() => { if (document.visibilityState === "visible") poll(); }, 4000);
    return () => clearInterval(t);
  }, [roomId, poll]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [ms.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setWarn("");
    const r = await fetch(`/api/bookings/${roomId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (!d?.ok) return setWarn(d?.error || "ส่งไม่สำเร็จ");
    setText(""); if (d.warning) setWarn(d.warning);
    last.current = Math.max(last.current, d.message.id); setMs((x) => [...x, d.message]);
  };

  if (err) return <div className="text-center" style={{ padding: "80px 24px" }}><p className="text-[#ff8a9a]">{err}</p><Link href="/chat" className="text-[#e8c472]">กลับไปรายการแชท</Link></div>;
  const open = b ? ["requested", "accepted", "checked_in", "cancel_requested"].includes(b.status) : true;
  return (
    <div className="flex flex-col h-dvh" style={{ background: "#171211" }}>
      <header className="flex items-center gap-[10px]" style={{ padding: "14px 12px", borderBottom: `1px solid ${LN}` }}>
        <Link href="/chat" aria-label="ย้อนกลับ" className="w-10 h-10 rounded-full grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
        {b && <img src={b.pt.img} alt="" className="w-[42px] h-[42px] rounded-full object-cover" />}
        <div className="flex-1 min-w-0"><div className="font-medium text-[16px]">{b?.pt.nick ?? "…"} <span className="text-[12px] font-light" style={{ color: GOLD }}>✓</span></div><div className="text-[12px] font-light text-[#d9c9b4]">{b ? `#${b.code}` : ""}</div></div>
        {b && <Link href={`/report?booking=${b.id}&nick=${encodeURIComponent(b.pt.nick)}`} aria-label="รายงานผู้ใช้" className="w-10 h-10 rounded-full grid place-items-center text-[#d9c9b4] hover:text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M5 21V4h11l-1.5 4L16 12H5" /></svg></Link>}
        <Link href="/sos" aria-label="SOS" className="h-10 px-3 rounded-full grid place-items-center text-[13px] font-semibold text-[#ff8a9a] hover:text-[#ff8a9a]" style={{ border: "1px solid rgba(255,138,154,.4)" }}>SOS</Link>
      </header>
      {b && ["accepted", "checked_in"].includes(b.status) && <div style={{ margin: "10px 12px 0" }}><CallButton bookingId={b.id} who="customer" peerName={b.pt.nick} /></div>}
      {b && (
        <Link href={`/order/${b.id}`} className="flex items-center gap-[10px] rounded-[14px] text-[#f3ead9] hover:text-[#f3ead9]" style={{ margin: "10px 12px 0", padding: "10px 12px", border: "1px solid rgba(212,175,55,.4)", background: "rgba(212,175,55,.06)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          <div className="flex-1 text-[13px] font-light"><b style={{ color: GOLD }}>{b.status === "requested" ? `กันเงิน ${baht(b.total_satang)} · รอ${b.pt.nick}ตอบรับ` : `ชำระแล้ว ${baht(b.total_satang)} · เงินพักไว้กับเราจนจบนัด`}</b><br /><span className="text-[#d9c9b4]">{b.place.label} {b.hours} ชม. · {new Date(b.starts_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
        </Link>
      )}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2" style={{ padding: "14px 12px" }}>
        <ChatNotice />
        {!ms.length && <div className="self-center text-[12px] font-light text-[#d9c9b4] text-center">เริ่มคุยรายละเอียดนัดได้เลย</div>}
        {ms.map((m) => m.sender_type === "system" ? (
          <div key={m.id} className="self-center max-w-[90%] text-center text-[12px] font-light text-[#d9c9b4] rounded-xl bg-[#211a18]" style={{ padding: "6px 12px" }}>{m.body}</div>
        ) : m.sender_type === "customer" ? (
          <div key={m.id} className="self-end max-w-[76%] flex flex-col items-end gap-0.5">
            <div className="text-[15px] leading-[1.45]" style={{ background: m.blocked ? "rgba(201,40,61,.2)" : GOLD, color: m.blocked ? "#ff8a9a" : "#1b130b", borderRadius: "20px 20px 6px 20px", padding: "10px 14px" }}>{m.body}</div>
            <span className="text-[12px] text-[#d9c9b4]">{time(m.created_at)}{m.blocked ? " · ไม่ถูกส่ง (ข้อความต้องห้าม)" : ""}</span>
          </div>
        ) : (
          <div key={m.id} className="self-start max-w-[76%] text-[15px] leading-[1.45] bg-[#251d1b]" style={{ borderRadius: "20px 20px 20px 6px", padding: "10px 14px" }}>{m.body}</div>
        ))}
        <div ref={end} />
      </div>
      {warn && <p role="alert" className="m-0 text-[12.5px] text-[#ff8a9a]" style={{ padding: "0 14px 6px" }}>{warn}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 items-center" style={{ padding: "10px 12px calc(22px + env(safe-area-inset-bottom))", borderTop: `1px solid ${LN}` }}>
        <label className="flex-1 h-[46px] rounded-full bg-[#211a18] flex items-center px-4" style={{ border: `1px solid ${LN}` }}>
          <input value={text} onChange={(e) => setText(e.target.value)} disabled={!open} maxLength={1000} placeholder={open ? "พิมพ์ข้อความ" : "แชทของนัดนี้ปิดแล้ว"} aria-label="พิมพ์ข้อความ" className="flex-1 min-w-0 bg-transparent outline-none text-[16px] text-[#f3ead9] placeholder:text-[#b5a596]" />
        </label>
        <button type="submit" aria-label="ส่ง" disabled={!text.trim() || busy || !open} className="w-[46px] h-[46px] rounded-full bg-[#e8c472] text-[#1b130b] grid place-items-center disabled:opacity-45">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
        </button>
      </form>
    </div>
  );
}
