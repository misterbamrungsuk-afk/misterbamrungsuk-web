"use client";

import { useState } from "react";
import Link from "next/link";
import { Turnstile } from "@/components/turnstile";

// กรอบขาว (บอสขอ 28 ต.ค. 2569 · หน้ามืดไป) — การ์ดขาว ช่องกรอกครีมอ่อน ตัวหนังสือเข้ม
// ตัวที่กรอกแล้ว เข้ม+ใหญ่ (บอสขอ 28 ต.ค.) · autofill ของเบราว์เซอร์ไม่ให้เป็นพื้นฟ้า/ตัวจาง
const inCls = "[color-scheme:light] w-full min-h-12 rounded-xl bg-[#f8f3ec] text-[#1a1210] [-webkit-text-fill-color:#1a1210] font-medium px-[14px] text-[17px] placeholder:font-normal placeholder:text-[#8a7b75] placeholder:[-webkit-text-fill-color:#8a7b75] outline-none border border-[#e7ddcf] focus:border-[#c9a24a] autofill:shadow-[inset_0_0_0_100px_#f8f3ec]";
const card = "rounded-[18px] bg-white text-[#2a1d1a] flex flex-col gap-2.5 shadow-[0_8px_24px_rgba(0,0,0,.25)]";
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
    <div data-recruit-apply-done className="rounded-[18px] bg-white text-[#2a1d1a] flex flex-col gap-2" style={{ padding: 18 }}>
      <b className="text-[18px] text-[#2f7a46]">ส่งใบสมัครแล้ว ✓</b>
      <p className="m-0 text-[14.5px] text-[#5c4f48] leading-[1.7]">ทีมงานจะตรวจข้อมูลและติดต่อกลับทางโทรศัพท์ / LINE พร้อม ID และรหัสผ่านเข้าแดชบอร์ด Recruit ของคุณ</p>
      <Link href="/recruit" className="self-start h-11 px-4 rounded-full grid place-items-center font-semibold text-[#8a6516] hover:text-[#8a6516]" style={{ border: "1px solid #c9a24a" }}>กลับหน้า Recruit</Link>
    </div>
  );

  return (
    <form onSubmit={submit} data-recruit-apply className="flex flex-col gap-3">
      <div className={card} style={{ padding: 18 }}>
        <b className="text-[17px]">ข้อมูลผู้สมัคร</b>
        <input className={inCls} value={f.name} onChange={set("name")} autoComplete="name" placeholder="ชื่อ-นามสกุล" aria-label="ชื่อ-นามสกุล" />
        <input className={inCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} inputMode="tel" autoComplete="tel" placeholder="เบอร์มือถือ 08x-xxx-xxxx" aria-label="เบอร์มือถือ" />
        <input className={inCls} value={f.email} onChange={set("email")} type="email" inputMode="email" autoComplete="email" autoCapitalize="off" placeholder="อีเมล (ใช้เป็น ID เข้าระบบ)" aria-label="อีเมล" />
        <input className={inCls} value={f.line_id} onChange={set("line_id")} autoCapitalize="off" placeholder="LINE ID (ถ้ามี)" aria-label="LINE ID" />
        <textarea className={`${inCls} py-3 min-h-20`} value={f.channel} onChange={set("channel")} maxLength={300} placeholder="จะหาคนจากช่องทางไหน เช่น เพื่อน กลุ่ม Facebook TikTok (ไม่บังคับ)" aria-label="ช่องทางที่จะหาคน" />
      </div>
      <div className={card} style={{ padding: 18 }}>
        <b className="text-[17px]">บัญชีรับค่าตอบแทน</b>
        <select className={inCls} value={f.bank} onChange={set("bank")} aria-label="ธนาคาร"><option value="">เลือกธนาคาร</option>{BANKS.map((b) => <option key={b} value={b}>{b}</option>)}</select>
        <input className={inCls} value={f.account} onChange={(e) => setF({ ...f, account: e.target.value.replace(/\D/g, "").slice(0, 15) })} inputMode="numeric" placeholder="เลขบัญชี" aria-label="เลขบัญชี" />
        <input className={inCls} value={f.account_name} onChange={set("account_name")} placeholder="ชื่อบัญชี (ตรงกับชื่อผู้สมัคร)" aria-label="ชื่อบัญชี" />
      </div>
      <label className="flex items-start gap-3 rounded-[18px] bg-white text-[#2a1d1a] text-[14px] leading-[1.6] cursor-pointer" style={{ padding: "14px 16px" }}>
        <input data-recruit-consent type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErr(""); }} className="mt-1 w-5 h-5 shrink-0 accent-[#a8781f]" style={{ colorScheme: "light" }} />
        <span className="text-[#3d302b] font-normal">ยอมรับเงื่อนไขโปรแกรม Recruit (ค่าแนะนำ ฿500 เมื่อผู้สมัครได้งานแรก · โบนัสรายเดือนตามที่บริษัทพิจารณา) และยินยอมให้บริษัทเก็บข้อมูลนี้เพื่อตรวจสอบและจ่ายค่าตอบแทน ตาม <Link href="/privacy" className="text-[#a8781f] underline">นโยบายความเป็นส่วนตัว</Link></span>
      </label>
      <Turnstile key={tsKey} onToken={setTs} />
      {err && <p role="alert" className="m-0 rounded-xl text-[14px] text-[#b42335] bg-white" style={{ padding: "10px 14px", border: "1px solid #f3c2c9" }}>{err}</p>}
      <button type="submit" disabled={busy || !consent} className="min-h-14 rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[17px] disabled:opacity-50">{busy ? "กำลังส่ง…" : "ส่งใบสมัคร Recruit"}</button>
      <p className="m-0 text-center text-[13px] text-[#b5a596]">เป็น Recruit อยู่แล้ว? <Link href="/recruit" className="text-[#e8c472]">เข้าสู่ระบบ</Link></p>
    </form>
  );
}
