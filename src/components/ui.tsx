"use client";

import React from "react";

// โลโก้ Mister Bamrungsuk: ตรา MB ในวงทอง + ชื่อแบรนด์ (ชุดเดียวกับเว็บรับสมัคร)
/** ตราโลโก้ Mister Bamrungsuk (รูปจริงจาก /brand/logo.png) */
export function LogoMark({ size = 28 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/logo.png" alt="" aria-hidden="true" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} />;
}

export function Logo({ size = 34, mark = true }: { size?: number; mark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 select-none" aria-label="Mister Bamrungsuk">
      {mark && <LogoMark size={Math.round(size * 1.05)} />}
      <span className="font-brand text-[#e8c472] whitespace-nowrap leading-none" style={{ fontSize: Math.max(12, Math.round(size * 0.4)), fontWeight: 400 }}>Mister Bamrungsuk</span>
    </span>
  );
}

export function Stars({ value, size = 14 }: { value: number | null; size?: number }) {
  if (value == null) return null;
  return (
    <span className="inline-flex items-center gap-0.5" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(value) ? "text-amber-500" : "text-ink-500"}>★</span>
      ))}
      <span className="ml-1 text-xs text-gold-300 font-medium">{value.toFixed(1)}</span>
    </span>
  );
}

export function VerifiedBadge({ label }: { label: string }) {
  return (
    <span className="chip chip-gold inline-flex items-center gap-1">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {label}
    </span>
  );
}

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] glass rounded-t-3xl animate-[sheetUp_.35s_cubic-bezier(.16,1,.3,1)] max-h-[85dvh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-ink-900/80 backdrop-blur border-b border-ink-600">
          <h3 className="font-semibold text-ink-100">{title}</h3>
          <button onClick={onClose} className="text-ink-300 hover:text-crimson-300 transition" aria-label="close">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl w-full max-w-md p-5 animate-rise">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-ink-300 hover:text-crimson-300" aria-label="close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon = "🌙", title, sub }: { icon?: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-rise">
      <div className="text-5xl mb-4 opacity-80">{icon}</div>
      <p className="text-ink-200 font-medium">{title}</p>
      {sub && <p className="text-ink-400 text-sm mt-2 max-w-[260px]">{sub}</p>}
    </div>
  );
}

export function Toast({ show, children, tone = "gold" }: { show: boolean; children: React.ReactNode; tone?: "gold" | "red" }) {
  if (!show) return null;
  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-full text-sm font-medium shadow-card animate-rise
      ${tone === "gold" ? "bg-gold-500/15 text-gold-300 border border-gold-500/40" : "bg-crimson-500/15 text-crimson-200 border border-crimson-500/40"}`}>
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="text-xs text-ink-300 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="section-title text-ink-100 mb-3">{children}</h2>;
}

export function baht(n: number) {
  return `฿${n.toLocaleString("th-TH")}`;
}
