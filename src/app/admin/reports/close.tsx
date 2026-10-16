"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CloseReport({ id }: { id: string }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const close = async () => {
    setBusy(true);
    await fetch("/api/admin/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, note }) }).catch(() => null);
    setBusy(false); router.refresh();
  };
  return (
    <span className="ml-auto flex gap-2 items-center">
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="ผลการตรวจ เช่น ตักเตือนแล้ว" className="h-9 w-56 max-w-[50vw] rounded-lg border border-ink-600 bg-[#130e0e] px-2.5 text-[12.5px] text-[#f6efe4] outline-none" />
      <button type="button" onClick={close} disabled={busy} className="chip h-9 px-3">ปิดเรื่อง</button>
    </span>
  );
}
