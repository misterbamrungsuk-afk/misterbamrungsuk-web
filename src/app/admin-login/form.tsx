"use client";

import { useState } from "react";

const input = "h-12 px-4 rounded-xl border border-[rgba(240,200,90,.38)] bg-[#130e0e] text-[#f6efe4] outline-none focus:border-[#f0c75a]";

export function AdminLoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // ขั้นที่ 2: บัญชีที่ตั้งยืนยันตัวตน 2 ชั้นไว้
  const [step2, setStep2] = useState(false);
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);

  // เต็มหน้า เพื่อให้ middleware อ่านคุกกี้ใหม่ · ต้องตั้ง 2 ชั้นก่อน (เปิดบังคับ) = ไปหน้าตั้งค่า
  const go = (data: { home?: string; enroll?: boolean }) => { window.location.href = data.enroll ? "/admin/security?required=1" : next || data.home || "/admin"; };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");
      if (data.mfa) { setStep2(true); setBusy(false); return; }
      go(data);
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/login/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await res.json();
      if (data.restart) { setStep2(false); setCode(""); setPassword(""); }
      if (!res.ok) throw new Error(data.error || "ยืนยันไม่สำเร็จ");
      go(data);
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy(false);
    }
  };

  if (step2) {
    return (
      <form onSubmit={verify} className="flex flex-col gap-4">
        <p className="text-sm text-[#d3c7bc]">บัญชีนี้เปิดยืนยันตัวตน 2 ชั้น · {useRecovery ? "ใส่รหัสกู้คืน 1 ชุด (ใช้ได้ครั้งเดียว)" : "เปิดแอป Authenticator แล้วใส่รหัส 6 หลัก"}</p>
        <label className="flex flex-col gap-1.5 text-sm text-[#cdbfb3]">{useRecovery ? "รหัสกู้คืน" : "รหัส 6 หลัก"}
          {useRecovery
            ? <input key="rc" required autoFocus autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} placeholder="xxxxx-xxxxx" className={input} />
            : <input key="otp" required autoFocus inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={`${input} tracking-[0.4em] text-lg`} />}
        </label>
        {err && <p role="alert" className="text-sm text-[#fca5a5]">{err}</p>}
        <button type="submit" disabled={busy} className="btn-red-lux h-12 rounded-full font-semibold text-base disabled:opacity-60">{busy ? "กำลังตรวจสอบ…" : "ยืนยัน"}</button>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <button type="button" onClick={() => { setUseRecovery(!useRecovery); setCode(""); setErr(""); }} className="text-[#ffd76a] min-h-9">{useRecovery ? "ใช้รหัส 6 หลักจากแอปแทน" : "ไม่มีโทรศัพท์? ใช้รหัสกู้คืน"}</button>
          <button type="button" onClick={() => { setStep2(false); setCode(""); setPassword(""); setErr(""); }} className="text-[#cdbfb3] min-h-9">เริ่มใหม่</button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm text-[#cdbfb3]">อีเมล
        <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-[#cdbfb3]">รหัสผ่าน
        <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
      </label>
      {err && <p role="alert" className="text-sm text-[#fca5a5]">{err}</p>}
      <button type="submit" disabled={busy} className="btn-red-lux h-12 rounded-full font-semibold text-base disabled:opacity-60">{busy ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}</button>
    </form>
  );
}
