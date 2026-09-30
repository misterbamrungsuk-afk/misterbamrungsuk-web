import Link from "next/link";
import type { ReactNode } from "react";

// หน้าว่าง (M14): วงแหวนไอคอน + หัวข้อ + คำอธิบาย + ปุ่ม CTA
export function EmptyState({ icon = "🔍", title, body, ctaLabel, ctaHref, onCta, tone = "gold" }: {
  icon?: ReactNode; title: string; body?: string; ctaLabel?: string; ctaHref?: string; onCta?: () => void; tone?: "gold" | "red";
}) {
  const ring = tone === "gold" ? "bg-gold-500/10 border-gold-500/30 text-gold-300" : "bg-crimson-500/10 border-crimson-500/30 text-crimson-300";
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-14 px-6 animate-rise">
      <div className={`w-28 h-28 rounded-full border grid place-items-center text-5xl ${ring}`}>{icon}</div>
      <h2 className="font-display text-xl font-semibold mt-1">{title}</h2>
      {body && <p className="text-sm text-ink-300 leading-relaxed max-w-[280px]">{body}</p>}
      {ctaLabel && ctaHref && <Link href={ctaHref} className="btn-crimson h-12 px-6 rounded-2xl font-display font-semibold inline-flex items-center mt-2">{ctaLabel}</Link>}
      {ctaLabel && !ctaHref && onCta && <button onClick={onCta} className="btn-crimson h-12 px-6 rounded-2xl font-display font-semibold mt-2">{ctaLabel}</button>}
    </div>
  );
}
