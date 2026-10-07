"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clearPlace, readPlace, type PickedPlace } from "@/lib/market/place-pick";

// แถบ "สถานที่ที่เลือก" เมื่อมาจากปุ่ม นัดเพื่อนที่นี่ (/home?place=…) — ขั้นจองจะเลือกสถานที่นี้ให้อัตโนมัติ
export function PlaceBanner() {
  const sp = useSearchParams();
  const [p, setP] = useState<PickedPlace | null>(null);
  useEffect(() => {
    const saved = readPlace();
    setP(saved && (!sp.get("place") || saved.id === sp.get("place")) ? saved : null);
  }, [sp]);
  if (!p) return null;
  return (
    <div className="mx-4 mt-3 rounded-2xl border border-gold-500/60 bg-gold-500/5 px-4 py-3 flex items-center gap-3 text-sm">
      <div className="flex-1 min-w-0">
        <p className="text-gold-300 font-semibold truncate">นัดที่ {p.name}</p>
        <p className="text-xs text-ink-300">เลือกเพื่อนแล้วกดจอง ระบบจะเลือกสถานที่นี้ให้</p>
      </div>
      <Link href={`/${p.kind === "spa" ? "spas" : "hotels"}/${p.id}`} className="text-xs text-ink-300 underline shrink-0">ดูสถานที่</Link>
      <button type="button" onClick={() => { clearPlace(); setP(null); }} className="text-xs text-ink-400 shrink-0" aria-label="ยกเลิกสถานที่">✕</button>
    </div>
  );
}
