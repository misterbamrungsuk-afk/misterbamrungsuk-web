"use client";
/* eslint-disable @next/next/no-img-element */

// บอร์ด C-ChatRoom — หัว (กลับ · รูป · ชื่อ ✓ · ออนไลน์ · โทร · เมนู) · แถบเงินพักไว้กับเรา · ข้อความ · การ์ดคำขอชำระเงิน · ช่องพิมพ์
// ตัวอย่างเท่านั้น: พิมพ์แล้วข้อความขึ้นในเครื่องนี้ + ตอบกลับอัตโนมัติ ไม่ส่งถึงใครจริง
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { priceOf, type Person } from "@/lib/home/people";

type Msg = { me: boolean; text: string; time?: string; pay?: number };
const baht = (n: number) => "฿" + n.toLocaleString("en-US");
const line = "rgba(243,234,217,0.07)";
const REPLIES = ["ได้เลยครับ เดี๋ยวผมเช็กตารางให้นะครับ", "โอเคครับ เจอกันตามนัดนะครับ ถึงแล้วจะทักไปครับ", "ขอบคุณครับ ถ้าอยากเปลี่ยนร้านบอกได้เลยนะครับ", "รับทราบครับ 🙏"];

export function ChatView({ p }: { p: Person }) {
  const total = priceOf(p);
  const [msgs, setMsgs] = useState<Msg[]>([
    { me: false, text: "ข้อความอัตโนมัติ: สวัสดีครับ อยากนัดวันไหน กี่โมง ที่ไหน และอยากทำอะไร บอกได้เลยครับ" },
    { me: true, text: `คืนนี้ 1 ทุ่ม ไปคาเฟ่แล้วต่อหนังแถว${p.area} 3 ชม. นะคะ`, time: "18:02 · อ่านแล้ว" },
    { me: false, text: "ได้เลยครับ ชำระในแอปได้เลยนะครับ เงินจะพักไว้กับเราจนจบนัด" },
    { me: false, text: "", pay: total },
    { me: false, text: "ได้รับแล้วครับ แล้วเจอกัน 1 ทุ่มนะครับ" },
  ]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const n = useRef(0);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, typing]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    const now = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    setMsgs((m) => [...m, { me: true, text: v, time: `${now} · ส่งแล้ว` }]);
    setText("");
    setTyping(true);
    const reply = REPLIES[n.current++ % REPLIES.length];
    setTimeout(() => { setTyping(false); setMsgs((m) => [...m, { me: false, text: reply }]); }, 1400);
  };
  const hb = "w-10 h-10 rounded-full grid place-items-center text-[#f3ead9] shrink-0 hover:text-[#f3ead9]";

  return (
    <div className="mb-v7 h-dvh flex flex-col" style={{ background: "#171211", color: "#f3ead9", lineHeight: "normal" }}>
      <div className="mx-auto w-full max-w-[760px] flex-1 min-h-0 flex flex-col lg:my-6 lg:rounded-[28px] lg:overflow-hidden lg:border lg:border-[rgba(243,234,217,0.07)] lg:bg-[rgba(28,22,21,.72)]">
        <header className="flex items-center gap-2.5" style={{ padding: "14px 12px", borderBottom: `1px solid ${line}` }}>
          <Link href={`/p/${p.id}`} aria-label="ย้อนกลับ" className={hb} style={{ border: `1px solid ${line}` }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
          <img src={p.img} alt="" className="w-[42px] h-[42px] rounded-full object-cover" />
          <div className="flex-grow min-w-0"><div className="font-medium text-[16px]">{p.nick} <span className="text-[#e8c472] text-[12px] font-light">✓</span></div><div className="text-[12px] font-light" style={{ color: p.free ? "#e8c472" : "#2FBF71" }}>{typing ? "กำลังพิมพ์…" : ""}</div></div>
          <Link href="/login" aria-label="โทรซ่อนเบอร์" className={hb} style={{ border: `1px solid ${line}` }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z" /></svg></Link>
          <Link href="/login" aria-label="รายงาน / บล็อก" className={hb} style={{ border: `1px solid ${line}` }}><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="12" cy="19" r="1.4" /></svg></Link>
        </header>

        <div className="flex items-center gap-2.5 rounded-[14px] text-[13px] font-light" style={{ margin: "10px 12px 0", padding: "10px 12px", border: "1px solid rgba(212,175,55,.4)", background: "rgba(212,175,55,.06)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e8c472" strokeWidth="1.8" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          <div className="flex-grow"><b className="text-[#e8c472] font-semibold">ชำระแล้ว {baht(total)} · เงินพักไว้กับเราจนจบนัด</b><br /><span className="text-[#d9c9b4]">คาเฟ่ &amp; ดูหนัง 3 ชม. · วันนี้ 19:00</span></div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2" style={{ padding: "14px 12px" }} aria-live="polite">
          <div className="self-center text-[12px] text-[#d9c9b4] font-light">วันนี้ · ตัวอย่างหน้าแชท</div>
          {msgs.map((m, i) => m.pay ? (
            <div key={i} className="self-start w-[240px] bg-[#211a18] rounded-[18px] flex flex-col gap-1.5" style={{ border: "1px solid #e8c472", padding: 14 }}>
              <div className="text-[12px] font-semibold text-[#e8c472]">คำขอชำระเงิน</div>
              <div className="font-semibold text-[28px]">{baht(m.pay)}</div>
              <div className="text-[12px] text-[#d9c9b4] font-light">ยอดเต็ม · พักไว้กับเราจนจบนัด</div>
              <span className="h-[38px] rounded-xl font-semibold text-[13px] grid place-items-center" style={{ background: "rgba(47,191,113,.12)", color: "#5EDB98" }}>ชำระแล้ว</span>
            </div>
          ) : (
            <div key={i} className={`flex flex-col gap-1 max-w-[76%] ${m.me ? "self-end items-end" : "self-start"}`}>
              <div className="text-[15px] leading-[1.45]" style={m.me ? { background: "#e8c472", color: "#1b130b", borderRadius: "20px 20px 6px 20px", padding: "10px 14px" } : { background: "#251d1b", borderRadius: "20px 20px 20px 6px", padding: "10px 14px" }}>{m.text}</div>
              {m.time && <div className="text-[12px] text-[#d9c9b4]">{m.time}</div>}
            </div>
          ))}
          {typing && <div className="self-start rounded-[20px] bg-[#251d1b] text-[#d9c9b4] text-[15px]" style={{ padding: "10px 16px" }} aria-label="กำลังพิมพ์">• • •</div>}
          <div ref={end} />
        </div>

        <form onSubmit={send} className="flex gap-2 items-center" style={{ borderTop: `1px solid ${line}`, padding: "10px 12px calc(14px + env(safe-area-inset-bottom))" }}>
          <Link href="/login" aria-label="ส่งรูป" className="w-11 h-11 rounded-full grid place-items-center text-[#f3ead9] shrink-0 hover:text-[#f3ead9]" style={{ border: `1px solid ${line}` }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 17-5-5-9 8" /></svg></Link>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="พิมพ์ข้อความ" aria-label="พิมพ์ข้อความ" className="flex-grow min-w-0 h-[46px] rounded-full bg-[#211a18] text-[15px] text-[#f3ead9] outline-none placeholder:text-[#b5a596] focus:border-[#e8c472]" style={{ border: `1px solid ${line}`, padding: "0 16px" }} />
          <button type="submit" aria-label="ส่ง" disabled={!text.trim()} className="w-[46px] h-[46px] rounded-full bg-[#e8c472] text-[#1b130b] grid place-items-center shrink-0 disabled:opacity-45"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg></button>
        </form>
      </div>
    </div>
  );
}
