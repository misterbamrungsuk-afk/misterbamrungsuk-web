"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function Unblock({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button type="button" disabled={busy} onClick={async () => { setBusy(true); await fetch("/api/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ block: id, on: false }) }).catch(() => null); router.refresh(); }} className="h-9 px-3.5 rounded-full text-[13px] text-[#e8c472] disabled:opacity-50" style={{ border: "1px solid rgba(232,196,114,.5)" }}>
      {busy ? "…" : "ยกเลิกบล็อก"}
    </button>
  );
}
