"use client";

// บอร์ด C-Register ขั้น "ลืมรหัสผ่าน" — กรอกอีเมล → ส่งลิงก์ตั้งรหัสใหม่ (30 นาที) · ระบบอีเมลยังไม่เปิด → ติดต่อแอดมินทาง LINE
import { useState } from "react";
import Link from "next/link";
import { lineAddUrl } from "@/lib/join/config";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"" | "busy" | "sent" | "nomail">("");
  const [error, setError] = useState("");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("อีเมลไม่ถูกต้อง");
    setState("busy");
    const r = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { ok?: boolean; mail?: boolean; error?: string } | undefined;
    if (!d?.ok) { setError(d?.error || "ส่งไม่สำเร็จ กรุณาลองใหม่"); setState(""); return; }
    setState(d.mail ? "sent" : "nomail");
  };

  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9" }}>
      <main className="mx-auto w-full max-w-[480px] md:max-w-[520px] md:pt-8 pb-8">
        <div className="flex items-center gap-2" style={{ padding: "12px 14px 0" }}>
          <Link href="/login" aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full grid place-items-center bg-[#211a18] text-[#e8c472] hover:text-[#e8c472]" style={{ border: `1px solid ${LN}` }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
          </Link>
          <div className="font-semibold text-[17px]" style={{ color: GOLD }}>ลืมรหัสผ่าน</div>
        </div>
        <form onSubmit={send} className="flex flex-col gap-[14px]" style={{ padding: "18px 18px 0" }} noValidate>
          <div><h1 className="m-0 font-semibold text-[24px]" style={{ color: GOLD }}>ลืมรหัสผ่าน</h1><p className="mt-1 mb-0 text-[13px] font-light text-[#d9c9b4]">บอกอีเมลที่ใช้สมัคร แล้วเราจะส่งลิงก์ตั้งรหัสใหม่ไปให้</p></div>
          <label><span className="block text-[12px] text-[#d9c9b4] mb-1.5 font-light">อีเมล</span>
            <input type="email" autoComplete="email" required placeholder="you@email.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="h-12 w-full rounded-xl bg-[#251d1b] text-[#f3ead9] px-[14px] text-[16px] outline-none border focus:border-[#e8c472] placeholder:text-[#b5a596]" style={{ borderColor: LN }} />
          </label>
          {state === "sent" && <div className="rounded-2xl text-[13px] font-light" style={{ padding: 14, background: "#211a18", border: "1px solid rgba(60,170,110,.5)", color: "#7fd6a3" }}>ถ้าอีเมลนี้มีบัญชี เราส่งลิงก์ไปแล้ว ลองเช็กอีเมลดูนะคะ (ลิงก์ใช้ได้ 30 นาที · ดูในอีเมลขยะด้วย)</div>}
          {state === "nomail" && <div className="rounded-2xl text-[13px] font-light text-[#d9c9b4]" style={{ padding: 14, background: "#211a18", border: `1px solid ${LN}` }}>ตอนนี้ตั้งรหัสใหม่ผ่านทีมงาน · ติดต่อแอดมินทาง <a href={lineAddUrl()} target="_blank" rel="noopener noreferrer" className="text-[#e8c472] font-semibold">LINE</a> พร้อมแจ้งอีเมลที่ใช้สมัคร</div>}
          {error && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{error}</p>}
          <button type="submit" disabled={state === "busy"} className="h-[52px] w-full rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold disabled:opacity-45">{state === "busy" ? "กำลังส่ง…" : state === "sent" ? "ส่งลิงก์อีกครั้ง" : "ส่งลิงก์รีเซ็ต"}</button>
          <Link href="/auth/register" className="h-12 w-full rounded-[14px] bg-[#211a18] text-[#e8c472] text-[14px] font-semibold grid place-items-center hover:text-[#e8c472]" style={{ border: `1px solid ${LN}` }}>กลับไปหน้าสมัคร</Link>
          <Link href="/login" className="text-center text-[13px] font-light text-[#e8c472] min-h-11 grid place-items-center">กลับไปหน้าเข้าสู่ระบบ</Link>
        </form>
      </main>
    </div>
  );
}
