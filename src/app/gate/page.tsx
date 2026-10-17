"use client";

import { useState } from "react";
import { Logo } from "@/components/ui";

export default function GatePage() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/gate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      const next = new URLSearchParams(location.search).get("next") || "/";
      // เฉพาะ path ในเว็บเรา — กัน //evil.com และ /\evil.com (open redirect)
      location.href = /^\/(?![\/\\])/.test(next) ? next : "/";
    } else { setErr(d.error || "รหัสไม่ถูกต้อง"); setBusy(false); }
  }

  return (
    <main className="app-frame mb-v7 mb-c flex flex-col items-center justify-center px-6">
      <Logo size={40} />
      <div className="mt-8 w-full max-w-[340px] rounded-[24px] border border-ink-600 bg-[#211a18] p-6">
        <div className="w-12 h-12 rounded-2xl bg-crimson-500/10 text-crimson-600 grid place-items-center mx-auto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-6 h-6"><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
        </div>
        <h1 className="font-display text-xl font-bold text-center mt-4">กำลังเตรียมเปิดให้บริการ</h1>
        <p className="text-sm text-ink-300 text-center mt-1.5">ใส่รหัสเพื่อเข้าชมเว็บไซต์</p>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="รหัสเข้าใช้งาน" className="input-dark h-12 text-center tracking-widest" />
          {err && <p className="text-xs text-crimson-600 text-center">{err}</p>}
          <button disabled={busy || !pw} className="btn-crimson h-12 font-semibold">{busy ? "…" : "เข้าสู่เว็บไซต์"}</button>
        </form>
      </div>
      <a href="/join" className="mt-6 text-sm text-ink-200 font-medium">สนใจสมัครเป็น Part-Time? ไปหน้ารับสมัคร →</a>
    </main>
  );
}
