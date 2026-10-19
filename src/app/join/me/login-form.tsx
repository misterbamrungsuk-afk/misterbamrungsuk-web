"use client";

// Part-Time เข้าสู่ระบบ: อีเมล + รหัสผ่านที่ตั้งตอนสมัคร → คุกกี้เข้าโปรไฟล์ของเครื่องนี้ → ไปโปรไฟล์
import { useState } from "react";
import { Turnstile } from "@/components/turnstile";

const inCls = "w-full min-h-12 rounded-xl bg-[#211a18] text-[#f3ead9] px-[14px] text-[15px] placeholder:text-[#b5a596] outline-none border border-transparent focus:border-[#e8c472]";

export function PtLoginForm() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [ts, setTs] = useState("");
  const [tsKey, setTsKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pw) return setErr("กรอกอีเมลและรหัสผ่าน");
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/join/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: email.trim(), password: pw, turnstile: ts }) });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; to?: string; error?: string };
      if (d.ok && d.to) { window.location.assign(d.to); return; }
      setErr(d.error || "เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง");
    } catch { setErr("เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง"); }
    setBusy(false); setTs(""); setTsKey((n) => n + 1);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl bg-[#251d1b] text-left" style={{ padding: 18 }} aria-labelledby="lg-h">
      <h2 id="lg-h" className="m-0 font-semibold text-[17px] text-[#e8c472]">Part-Time เข้าสู่ระบบ</h2>
      <input className={inCls} type="email" inputMode="email" autoComplete="email" autoCapitalize="off" spellCheck={false} placeholder="อีเมลที่ใช้สมัคร" aria-label="อีเมล" value={email} onChange={(e) => { setEmail(e.target.value.replace(/\s/g, "")); setErr(""); }} />
      <div className="relative">
        <input className={inCls + " pr-[76px]"} type={show ? "text" : "password"} autoComplete="current-password" placeholder="รหัสผ่าน" aria-label="รหัสผ่าน" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className="absolute right-1 top-1/2 -translate-y-1/2 min-h-10 px-3 rounded-lg text-[13px] text-[#e8c472]">{show ? "ซ่อน" : "แสดง"}</button>
      </div>
      <Turnstile key={tsKey} onToken={setTs} />
      {err && <p role="alert" className="m-0 text-[13.5px] text-[#ff8a9a]">{err}</p>}
      <button type="submit" disabled={busy} aria-busy={busy} className="h-[52px] rounded-full grid place-items-center font-semibold bg-[#e8c472] text-[#1b130b] disabled:opacity-60">{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
    </form>
  );
}
