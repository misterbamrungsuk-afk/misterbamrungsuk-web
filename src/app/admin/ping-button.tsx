"use client";

import { useState } from "react";

// ปุ่มทดสอบบริการภายนอกจริง (Slip2Go / อีเมล) — ผลแสดงข้างปุ่ม
export function PingButton({ service, label }: { service: "slip2go" | "email"; label: string }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; detail: string } | null>(null);
  const run = async () => {
    setBusy(true); setRes(null);
    const r = await fetch("/api/admin/ping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ service }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { ok: boolean; detail: string } | null;
    setRes(j ?? { ok: false, detail: "ทดสอบไม่สำเร็จ" });
    setBusy(false);
  };
  return (
    <span className="block text-xs mt-1">
      <button type="button" onClick={run} disabled={busy} className="rounded-lg border border-ink-600 px-2.5 py-1 disabled:opacity-50">{busy ? "กำลังทดสอบ…" : label}</button>
      {res && <span role="status" className={`ml-2 ${res.ok ? "text-emerald-400" : "text-amber-400"}`}>{res.ok ? "ใช้ได้" : "ไม่ผ่าน"}{res.detail ? ` · ${res.detail}` : ""}</span>}
    </span>
  );
}
