"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 1500); } catch { window.prompt("คัดลอกลิงก์", url); }
  };
  return <button type="button" onClick={copy} className="h-11 px-4 rounded-full border text-[14px] font-semibold text-[#2a1d1a]" style={{ borderColor: "#e7ddcf" }}>{done ? "คัดลอกแล้ว ✓" : "คัดลอกลิงก์"}</button>;
}
