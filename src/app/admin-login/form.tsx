"use client";

import { useState } from "react";

export function AdminLoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");
      // เต็มหน้า เพื่อให้ middleware อ่านคุกกี้ใหม่
      window.location.href = next || data.home || "/admin";
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm text-[#cdbfb3]">อีเมล
        <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 px-4 rounded-xl border border-[rgba(240,200,90,.38)] bg-[#130e0e] text-[#f6efe4] outline-none focus:border-[#f0c75a]" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-[#cdbfb3]">รหัสผ่าน
        <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 px-4 rounded-xl border border-[rgba(240,200,90,.38)] bg-[#130e0e] text-[#f6efe4] outline-none focus:border-[#f0c75a]" />
      </label>
      {err && <p role="alert" className="text-sm text-[#fca5a5]">{err}</p>}
      <button type="submit" disabled={busy} className="btn-red-lux h-12 rounded-full font-semibold text-base disabled:opacity-60">{busy ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}</button>
    </form>
  );
}
