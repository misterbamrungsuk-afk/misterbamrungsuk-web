"use client";

import { useState } from "react";

export function CopyCode({ code }: { code: string }) {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setOk(true); setTimeout(() => setOk(false), 2000); } catch { /* ไม่รองรับ */ }
  };
  return (
    <button type="button" onClick={copy} className="min-h-11 rounded-xl border border-[rgba(240,200,90,.38)] bg-[rgba(14,10,10,.5)] flex items-center justify-center gap-2 text-[13px]" style={{ color: ok ? "#7fd6a3" : "#ffd76a" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4H4v12h4" /></svg>
      {ok ? "คัดลอกแล้ว" : "คัดลอกรหัส"}
    </button>
  );
}

export function LineButton({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="min-h-[52px] rounded-[14px] bg-[#06c755] !text-white font-lux text-[15px] flex items-center justify-center gap-2.5 no-underline">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M12 4C7 4 3 7.2 3 11c0 3.4 3 6.2 7.2 6.9L10 21l3.6-3.1C18 17.4 21 14.5 21 11c0-3.8-4-7-9-7z" /></svg>
      ติดต่อทีมพาร์ทเนอร์ทาง LINE
    </a>
  );
}
