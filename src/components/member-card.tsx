"use client";
/* eslint-disable @next/next/no-img-element */
import { useI18n } from "@/i18n/provider";
// บัตรสมาชิกดิจิทัล — Gold = แดงเลือดหมู-ทอง · Black = ดำ-ทอง · ใช้ในหน้าเมมเบอร์ / บัญชี / ป๊อปอัปหน้าแรก (ตัวอย่าง)
export type CardTier = "gold" | "black";
export const TIER_LOOK: Record<CardTier, { bg: string; ring: string; label: string; text: string }> = {
  gold: { bg: "linear-gradient(135deg, #8d1424 0%, #5c0c18 45%, #2e050b 100%)", ring: "#e8c472", label: "GOLD MEMBER", text: "#f6dc9a" },
  black: { bg: "linear-gradient(135deg, #2c2622 0%, #141110 50%, #050404 100%)", ring: "#d9b25c", label: "BLACK MEMBER", text: "#f3e3b5" },
};

export function MemberCard({ tier, name, no, since, points, sample = false, className = "" }: { tier: CardTier; name: string; no?: string | null; since?: string | null; points?: number; sample?: boolean; className?: string }) {
  const L = TIER_LOOK[tier];
  const { lang, s: S } = useI18n();
  const year = since ? new Date(since).toLocaleDateString(S.intl, { timeZone: "Asia/Bangkok", month: "short", year: "2-digit" }) : "—";
  return (
    <div className={`@container relative w-full max-w-[380px] aspect-[1.586] rounded-[18px] overflow-hidden text-left ${className}`}
      style={{ background: L.bg, boxShadow: `0 0 0 1.5px ${L.ring}, 0 14px 40px rgba(0,0,0,.45)`, color: L.text }}>
      {/* ลายเส้นทองโค้ง + แสงเงา */}
      <svg className="absolute inset-0 w-full h-full opacity-[.18]" viewBox="0 0 380 240" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-20 200 C 80 120, 200 260, 400 120" fill="none" stroke={L.ring} strokeWidth="1.2" />
        <path d="M-20 225 C 90 150, 210 285, 400 150" fill="none" stroke={L.ring} strokeWidth=".8" />
        <path d="M-20 175 C 70 95, 190 235, 400 95" fill="none" stroke={L.ring} strokeWidth=".6" />
      </svg>
      <span className="absolute -top-[17cqw] -right-[10cqw] w-[50cqw] h-[50cqw] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,241,201,.22), rgba(255,241,201,0) 65%)" }} aria-hidden="true" />
      <div className="relative h-full flex flex-col justify-between p-[6cqw]">
        <div className="flex items-start justify-between gap-[2cqw]">
          <span className="flex items-center gap-[2cqw]">
            <img src="/brand/logo.png" alt="" className="w-[10.5cqw] h-[10.5cqw] object-contain" />
            <span className="font-brand text-[3.4cqw] leading-tight">Mister<br />Bamrungsuk</span>
          </span>
          <span className="text-right">
            <span className="block text-[2.8cqw] tracking-[.22em] font-semibold whitespace-nowrap">{L.label}</span>
            {sample && <span className="inline-block mt-[1cqw] rounded-full px-[2cqw] text-[2.8cqw] font-semibold text-[#1b130b]" style={{ background: L.ring }}>{lang === "th" ? "ตัวอย่าง" : lang === "zh" ? "示例" : "Sample"}</span>}
          </span>
        </div>
        {/* ชิปทอง */}
        <span className="w-[11.6cqw] h-[8.4cqw] rounded-[1.6cqw]" style={{ background: "linear-gradient(135deg, #fff1c9, #c9a24a 55%, #8f6a1f)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.25)" }} aria-hidden="true" />
        <div className="flex items-end justify-between gap-[3cqw]">
          <span className="min-w-0">
            <span className="block text-[4.5cqw] font-semibold truncate" style={{ color: "#fff7e8" }}>{name || "สมาชิก"}</span>
            <span className="block text-[3.2cqw] tracking-[.14em] tabular-nums opacity-90">{no || "MBM •••• ••••"}</span>
          </span>
          <span className="text-right shrink-0 text-[2.9cqw] leading-[1.5] opacity-95">
            <span className="block">{lang === "th" ? "ตั้งแต่" : lang === "zh" ? "自" : "Since"} {year}</span>
            {typeof points === "number" && <span className="block font-semibold text-[3.4cqw]">{points.toLocaleString("th-TH")} แต้ม</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
