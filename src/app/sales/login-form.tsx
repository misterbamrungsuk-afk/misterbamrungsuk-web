"use client";

import { useState } from "react";

// เข้าแดชบอร์ด Recruit ด้วย ID / รหัสผ่านที่ทีมงานออกให้
export function SalesLogin() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/sales/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (j?.ok) { window.location.href = "/sales/me"; return; }
    setBusy(false); setErr(j?.error || "เข้าสู่ระบบไม่สำเร็จ");
  };
  const inp = "w-full h-12 rounded-xl px-3 bg-[#171211] text-[16px] text-[#f3ead9] outline-none border border-[rgba(243,234,217,.12)] focus:border-[#e8c472]";
  return (
    <form onSubmit={submit} data-sales-login className="rounded-[18px] bg-[#211a18] flex flex-col gap-2.5" style={{ padding: 16, border: "1px solid rgba(232,196,114,.45)" }}>
      <b className="text-[17px]">Recruit เข้าสู่ระบบ</b>
      <label className="flex flex-col gap-1 text-[13px] text-[#d9c9b4]">ID<input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoCapitalize="none" className={inp} /></label>
      <label className="flex flex-col gap-1 text-[13px] text-[#d9c9b4]">รหัสผ่าน<input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" className={inp} /></label>
      {err && <p role="alert" className="m-0 text-[13.5px] text-[#ff8a9a]">{err}</p>}
      <button type="submit" disabled={busy || !u.trim() || !p} className="h-12 rounded-xl font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-40">{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
      <span className="text-[12.5px] text-[#b5a596]">ยังไม่มี ID · ลืมรหัสผ่าน → ติดต่อทีมงานให้ออกให้ใหม่</span>
    </form>
  );
}
