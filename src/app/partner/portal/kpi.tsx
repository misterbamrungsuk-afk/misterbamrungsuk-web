"use client";

import { useState } from "react";

export type KpiSet = [string, string][];
const RANGES = [["today", "วันนี้"], ["7d", "7 วัน"], ["month", "เดือนนี้"]] as const;

export function KpiTabs({ sets }: { sets: Record<(typeof RANGES)[number][0], KpiSet> }) {
  const [r, setR] = useState<(typeof RANGES)[number][0]>("today");
  return (
    <section className="mt-5">
      <div className="flex gap-2" role="tablist">
        {RANGES.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={r === k} onClick={() => setR(k)} className={`chip h-9 px-4 ${r === k ? "chip-gold" : ""}`}>{l}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        {sets[r].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-ink-600 bg-ink-800/60 p-4">
            <p className="text-xs text-ink-300">{k}</p>
            <p className="font-display text-2xl font-semibold text-gold-300 mt-1">{v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
