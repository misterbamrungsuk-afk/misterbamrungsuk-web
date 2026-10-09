"use client";

import { useEffect, useState } from "react";
import { Turnstile } from "./turnstile";

// ขั้นยืนยันเบอร์โทรด้วย OTP (+ Turnstile ตอนขอรหัส) — เรียก onVerified(phone) เมื่อผ่าน
export function OtpStep({ phone, onPhone, verified, onVerified, inputCls }: {
  phone: string; onPhone: (v: string) => void; verified: boolean; onVerified: () => void; inputCls: string;
}) {
  const [ts, setTs] = useState("");
  const [tsKey, setTsKey] = useState(0);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [cool, setCool] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [off, setOff] = useState(false); // เว็บจริงยังไม่มีระบบ SMS → ยืนยันเบอร์โดยไม่ใช้รหัส

  useEffect(() => {
    fetch("/api/otp/verify", { cache: "no-store" }).then((r) => r.json()).then((d: { required?: boolean }) => setOff(d.required === false)).catch(() => {});
  }, []);

  const skipVerify = async () => {
    setBusy(true); setMsg("");
    const r = await fetch("/api/otp/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, skip: true }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { ok?: boolean; error?: string } | undefined;
    setBusy(false);
    if (d?.ok) onVerified(); else setMsg(d?.error || "บันทึกเบอร์ไม่สำเร็จ");
  };

  useEffect(() => {
    if (cool <= 0) return;
    const t = setTimeout(() => setCool((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cool]);

  const send = async () => {
    setBusy(true); setMsg("");
    const r = await fetch("/api/otp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, turnstile: ts }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { ok?: boolean; error?: string; devCode?: string; retryAfter?: number } | undefined;
    setBusy(false);
    setTs(""); setTsKey((k) => k + 1); // token ใช้ได้ครั้งเดียว
    if (!d?.ok) { setMsg(d?.error || "ส่งรหัสไม่สำเร็จ"); if (d?.retryAfter) setCool(d.retryAfter); return; }
    setSent(true); setCool(60); setDevCode(d.devCode ?? "");
  };

  const verify = async (c = code) => {
    setBusy(true); setMsg("");
    const r = await fetch("/api/otp/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code: c }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { ok?: boolean; error?: string } | undefined;
    setBusy(false);
    if (d?.ok) onVerified(); else setMsg(d?.error || "ยืนยันไม่สำเร็จ");
  };

  if (verified) return <p className="text-[13px] text-[#8f5e00] px-1">✓ ยืนยันเบอร์ {phone} แล้ว</p>;

  const phoneOk = /^0[689]\d{8}$/.test(phone.replace(/\D/g, ""));
  if (off) return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input type="tel" inputMode="tel" autoComplete="tel" placeholder="เบอร์มือถือ 08x-xxx-xxxx" value={phone} onChange={(e) => onPhone(e.target.value)} className={inputCls} />
        <button type="button" onClick={skipVerify} disabled={!phoneOk || busy} className="h-12 shrink-0 px-4 rounded-2xl border border-gold-500 text-[#8f5e00] font-semibold text-sm disabled:opacity-50">ใช้เบอร์นี้</button>
      </div>
      {msg && <p className="text-[12.5px] text-[#b3122a] px-1" role="alert">{msg}</p>}
    </div>
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input type="tel" inputMode="tel" autoComplete="tel" placeholder="เบอร์มือถือ 08x-xxx-xxxx" value={phone} onChange={(e) => { onPhone(e.target.value); setSent(false); }} className={inputCls} />
        <button type="button" onClick={send} disabled={!phoneOk || busy || cool > 0} className="h-12 shrink-0 px-4 rounded-2xl border border-gold-500 text-[#8f5e00] font-semibold text-sm disabled:opacity-50">
          {cool > 0 ? `${cool} วิ` : sent ? "ส่งใหม่" : "ขอรหัส"}
        </button>
      </div>
      {!sent && <Turnstile key={tsKey} onToken={setTs} />}
      {sent && (
        <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="รหัส OTP 6 หลัก" value={code}
          onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setCode(v); if (v.length === 6) verify(v); }} className={`${inputCls} tracking-[0.4em] text-center`} />
      )}
      {sent && <p className="text-[12px] text-ink-300 px-1">ส่งรหัสทาง SMS แล้ว ใช้ได้ภายใน 5 นาที</p>}
      {devCode && <p className="text-[12px] text-[#8f5e00] px-1">โหมดทดสอบ: รหัสคือ <b>{devCode}</b></p>}
      {msg && <p className="text-[12.5px] text-[#b3122a] px-1" role="alert">{msg}</p>}
    </div>
  );
}
