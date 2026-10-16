"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClosePost({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} onClick={async () => { setBusy(true); await fetch(`/api/posts/${id}`, { method: "POST" }).catch(() => null); router.refresh(); }}
      className="w-full min-h-11 rounded-[14px] text-[14px] text-[#ff8a9a] disabled:opacity-50" style={{ background: "rgba(201,40,61,.16)" }}>{busy ? "กำลังปิด…" : "ปิดโพสต์"}</button>
  );
}
