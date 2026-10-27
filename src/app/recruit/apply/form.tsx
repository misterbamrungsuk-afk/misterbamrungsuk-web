"use client";

import { useState } from "react";
import Link from "next/link";
import { Turnstile } from "@/components/turnstile";

const inCls = "w-full min-h-12 rounded-xl bg-[#211a18] text-[#f3ead9] px-[14px] text-[15px] placeholder:text-[#b5a596] outline-none border border-transparent focus:border-[#e8c472]";
const BANKS = ["กสิกรไทย (KBank)", "ไทยพาณิชย์ (SCB)", "กรุงเทพ (BBL)", "กรุงไทย (KTB)", "กรุงศรีอยุธยา (BAY)", "ทหารไทยธนชาต (ttb)", "ออมสิน (GSB)", "อื่น ๆ"];

export function RecruitApplyForm() {
  const [f, setF] = useState({ name: "", phone: "", email: "", line_id: "", channel: "", bank: "", account: "", account_name: "" });
  const [consent, setConsent] = useState(false);
  const [ts, setTs] = useState("");
  const [tsKey, setTsKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setErr(""); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    const r = await fetch("/api/recruit/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, consent, turnstile: ts }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    setBusy(false);
    if (j?.ok) { setDone(true); return; }
    setErr(j?.error || "ส่งใบสมัครไม่สำเร็จ ลองใหม่อีกครั้ง");
    setTs(""); setTsKey((n) => n + 1);
  };

  if (done) return (
    <div data-recruit-apply-done className="rounded-[18px] bg-[#211a18] flex flex-col gap-2" style={{ padding: 18 }}>
      <b className="text-[18px] text-[#7fd6a3]">ส่งใบสมัครแล้ว ✓</b>
      <p className="m-0 text-[14.5px] text-[#d9c9b4] leading-[1.7]">ทีมงานจะตรวจข้อมูลและติดต่อกลับทางโทรศัพท์ / LINE พร้อม ID และรหัสผ่านเข้าแดชบอร์ด Recruit ของคุณ</p>
      <Link href="/recruit" className="self-start h-11 px-4 rounded-full grid place-items-center font-semibold text-[#e8c472] hover:text-[#e8c472]" style={{ border: "1px solid #e8c472" }}>กลับหน้า Recruit</Link>
    </div>
  );

  return (
    <form onSubmit={submit} data-recruit-apply className="flex flex-col gap-3">
      <div className="rounded-[18px] bg-[#251d1b] flex flex-col gap-2.5" style={{ padding: 16 }}>
        <b className="text-[16px]">ข้อมูลผู้สมัคร</b>
        <input className={inCls} value={f.name} onChange={set("name")} autoComplete="name" placeholder="ชื่อ-นามสกุล" aria-label="ชื่อ-นามสกุล" />
        <input className={inCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} inputMode="tel" autoComplete="tel" placeholder="เบอร์มือถือ 08x-xxx-xxxx" aria-label="เบอร์มือถือ" />
        <input className={inCls} value={f.email} onChange={set("email")} type="email" inputMode="email" autoComplete="email" autoCapitalize="off" placeholder="อีเมล (ใช้เป็น ID เข้าระบบ)" aria-label="อีเมล" />
        <input className={inCls} value={f.line_id} onChange={set("line_id")} autoCapitalize="off" placeholder="LINE ID (ถ้ามี)" aria-label="LINE ID" />
        <textarea className={`${inCls} py-3 min-h-20`} value={f.channel} onChange={set("channel")} maxLength={300} placeholder="จะหาคนจากช่องทางไหน เช่น เพื่อน กลุ่ม Facebook TikTok (ไม่บังคับ)" aria-label="ช่องทางที่จะหาคน" />
      </div>
      <div className="rounded-[18px] bg-[#251d1b] flex flex-col gap-2.5" style={{ padding: 16 }}>
        <b className="text-[16px]">บัญชีรับค่าตอบแทน</b>
        <select className={inCls} value={f.bank} onChange={set("bank")} aria-label="ธนาคาร"><option value="">เลือกธนาคาร</option>{BANKS.map((b) => <option key={b} value={b}>{b}</option>)}</select>
        <input className={inCls} value={f.account} onChange={(e) => setF({ ...f, account: e.target.value.replace(/\D/g, "").slice(0, 15) })} inputMode="numeric" placeholder="เลขบัญชี" aria-label="เลขบัญชี" />
        <input className={inCls} value={f.account_name} onChange={set("account_name")} placeholder="ชื่อบัญชี (ตรงกับชื่อผู้สมัคร)" aria-label="ชื่อบัญชี" />
      </div>
      <label className="flex items-start gap-3 rounded-xl text-[14px] leading-[1.6] cursor-pointer" style={{ padding: "12px 14px", background: "#211a18" }}>
        <input data-recruit-consent type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErr(""); }} className="mt-1 w-5 h-5 shrink-0 accent-[#e8c472]" />
        <span>ยอมรับเงื่อนไขโปรแกรม Recruit (ค่าแนะนำ ฿500 เมื่อผู้สมัครได้งานแรก · โบนัสรายเดือนตามที่บริษัทพิจารณา) และยินยอมให้บริษัทเก็บข้อมูลนี้เพื่อตรวจสอบและจ่ายค่าตอบแทน ตาม <Link href="/privacy" className="text-[#e8c472] underline">นโยบายความเป็นส่วนตัว</Link></span>
      </label>
      <Turnstile key={tsKey} onToken={setTs} />
      {err && <p role="alert" className="m-0 rounded-xl text-[14px] text-[#ff8a9a]" style={{ padding: "10px 14px", background: "rgba(255,138,154,.1)" }}>{err}</p>}
      <button type="submit" disabled={busy || !consent} className="min-h-14 rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[17px] disabled:opacity-50">{busy ? "กำลังส่ง…" : "ส่งใบสมัคร Recruit"}</button>
      <p className="m-0 text-center text-[13px] text-[#b5a596]">เป็น Recruit อยู่แล้ว? <Link href="/recruit" className="text-[#e8c472]">เข้าสู่ระบบ</Link></p>
    </form>
  );
}
