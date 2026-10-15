"use client";

import { useState } from "react";

export function CopyButton({ code }: { code: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(code); setOk(true); setTimeout(() => setOk(false), 1800); } catch {} }}
      aria-label={`คัดลอกรหัส ${code}`}
      style={{ minHeight: 48, borderRadius: 12, border: "1px solid rgba(243,234,217,.14)", background: "rgba(23,18,17,.5)", color: ok ? "#7fd6a3" : "#e8c472", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 300 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4H4v12h4" /></svg>
      {ok ? "คัดลอกแล้ว" : "คัดลอกรหัส"}
    </button>
  );
}
