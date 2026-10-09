"use client";

import { useState } from "react";

export function CopyCode({ code }: { code: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={async () => { try { await navigator.clipboard.writeText(code); setOk(true); setTimeout(() => setOk(false), 1800); } catch {} }}
      className="mt-1 flex flex-col items-center min-h-12" aria-label={`คัดลอกรหัส ${code}`}>
      <span className="font-display text-[40px] leading-none font-bold tracking-wider text-gradient-gold">{code}</span>
      <span className="text-xs text-gold-400 mt-2">{ok ? "✓ คัดลอกแล้ว" : "แตะเพื่อคัดลอก"}</span>
    </button>
  );
}

export function ContractAccept({ mb, acceptedAt }: { mb: string; acceptedAt: string | null }) {
  const [at, setAt] = useState(acceptedAt);
  const [check, setCheck] = useState(false);
  const [busy, setBusy] = useState(false);
  if (at) return <p className="mt-4 text-sm text-gold-300">✓ ยอมรับสัญญาแล้วเมื่อ {new Date(at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</p>;
  const accept = async () => {
    setBusy(true);
    const res = await fetch("/api/join/contract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb }) }).catch(() => null);
    const data = res?.ok ? await res.json() : null;
    if (data?.at) setAt(data.at);
    setBusy(false);
  };
  return (
    <div className="mt-4 flex flex-col gap-3">
      <label className="flex items-start gap-3 text-sm cursor-pointer min-h-9">
        <input type="checkbox" checked={check} onChange={(e) => setCheck(e.target.checked)} className="w-5 h-5 mt-0.5 accent-[#e0243c] shrink-0" />
        ข้าพเจ้าอ่านและยอมรับสัญญาข้างต้นแล้ว
      </label>
      <button onClick={accept} disabled={!check || busy} className="btn-crimson h-12 font-semibold">{busy ? "กำลังบันทึก…" : "ยืนยันยอมรับสัญญา"}</button>
    </div>
  );
}

/** ปุ่มคัดลอกรหัสแบบบอร์ด JoinDone */
export function CopyButton({ code }: { code: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(code); setOk(true); setTimeout(() => setOk(false), 1800); } catch {} }}
      aria-label={`คัดลอกรหัส ${code}`}
      style={{ minHeight: 48, borderRadius: 12, border: "1px solid rgba(240,200,90,.38)", background: "rgba(14,10,10,.5)", color: ok ? "#7fd6a3" : "#ffd76a", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4H4v12h4" /></svg>
      {ok ? "คัดลอกแล้ว" : "คัดลอกรหัส"}
    </button>
  );
}
