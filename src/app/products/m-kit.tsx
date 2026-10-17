"use client";

import Link from "next/link";
import { SmartBack } from "@/components/smart-back";
import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_QTY, baht, imageUrl, type Product } from "@/lib/market/config";
import { readCart, useCart, writeCart } from "./market-ui";
import { SiteHeader } from "@/components/site-header";

// ชุด UI มือถือของ Marketplace ตามบอร์ดดีไซน์ (390px, กว้างสุด 480px กลางจอ)

export const LINE = "rgba(232,196,114,.38)";
export const RED_GRAD = "#e8c472"; // ปุ่มหลักโทน v7 (ทอง) — ข้อความบนปุ่มใช้สีเข้ม #1b130b
export const fmt = (n: number) => "฿" + baht(n);

export function MShell({ children, className = "", wide = false }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return (
    <main className={`mb-v7 mb-c w-full max-w-[480px] md:max-w-[760px] ${wide ? "lg:max-w-[1120px]" : ""} mx-auto min-h-dvh bg-[#171211] text-[#f3ead9] relative overflow-x-hidden ${className}`}><SiteHeader />{children}</main>
  );
}

export const CartIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M5 7h14l-1.5 12h-11z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
);
export const BoxIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></svg>
);

const circle = "w-11 h-11 shrink-0 rounded-full border grid place-items-center text-[#f3ead9] relative";

export function CartCount() {
  const n = useCart().reduce((s, l) => s + l.qty, 0);
  return n > 0 ? <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-[5px] rounded-full bg-[#e8c472] text-[#1b130b] text-[11.5px] font-bold grid place-items-center border-[1.5px] border-[#171211]">{n}</span> : null;
}

export function MHeader({ back, eyebrow, title, cart = true, onBack }: { back?: string; eyebrow: string; title: string; cart?: boolean; onBack?: () => void }) {
  const backIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m15 18-6-6 6-6" /></svg>;
  return (
    <header className="sticky top-0 z-30 bg-[#171211] flex items-center gap-3 px-[18px] py-4 h-[77px] border-b" style={{ borderColor: LINE }}>
      {onBack
        ? <button type="button" onClick={onBack} aria-label="ย้อนกลับ" className={circle} style={{ borderColor: LINE }}>{backIcon}</button>
        : <SmartBack href={back ?? "/market"} className={circle} style={{ borderColor: LINE }}>{backIcon}</SmartBack>}
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] tracking-[2.5px] text-[#e8c472] font-semibold">{eyebrow}</p>
        <h1 className="m-0 font-lux font-semibold text-[20px] truncate">{title}</h1>
      </div>
      {cart && <Link href="/cart" aria-label="ตะกร้า" className={circle} style={{ borderColor: LINE }}><CartIcon /><CartCount /></Link>}
    </header>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className="min-h-10 px-3.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap shrink-0 border"
      style={{ borderColor: on ? "#e8c472" : LINE, background: on ? "#e8c472" : "#211a18", color: on ? "#1b130b" : "#d9c9b4" }}>{children}</button>
  );
}

export function useToast() {
  const [text, setText] = useState("");
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flash = useCallback((s: string) => { setText(s); clearTimeout(t.current); t.current = setTimeout(() => setText(""), 1800); }, []);
  return { text, flash };
}
export function Toast({ text, bottom = 84, tone = "ok" }: { text: string; bottom?: number; tone?: "ok" | "err" }) {
  if (!text) return null;
  return (
    <div role="status" className="fixed z-40 left-1/2 -translate-x-1/2 w-[calc(min(100vw,480px)-36px)] px-3.5 py-3 rounded-xl bg-[#21191a] border text-[13px]"
      style={{ bottom, borderColor: tone === "ok" ? "#3f8f63" : "#b0182c", color: tone === "ok" ? "#7fd6a3" : "#ef8a97" }}>{text}</div>
  );
}

/** เพิ่มลงตะกร้า (localStorage) — คืนจำนวนใหม่ หรือ null ถ้าเต็ม/หมด */
export function addToCart(id: string, stock: number, qty = 1): number | null {
  if (stock <= 0) return null;
  const lines = readCart();
  const l = lines.find((x) => x.id === id);
  const cap = Math.min(MAX_QTY, stock);
  if (l) { if (l.qty >= cap) return null; l.qty = Math.min(cap, l.qty + qty); } else lines.push({ id, qty: Math.min(cap, qty) });
  writeCart(lines);
  return (l?.qty ?? Math.min(cap, qty));
}

/** แถบตะกร้าลอยด้านล่าง — prices = ราคาสินค้าที่รู้จัก (id → ราคา) */
export function CartBar({ prices }: { prices: Record<string, number> }) {
  const lines = useCart();
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + (prices[l.id] ?? 0) * l.qty, 0);
  return (
    <Link href="/cart" className="fixed z-30 bottom-4 left-1/2 -translate-x-1/2 w-[calc(min(100vw,480px)-36px)] h-[52px] rounded-[14px] border bg-[#211a18] text-[#f3ead9] flex items-center justify-between px-4 text-sm"
      style={{ borderColor: "rgba(232,196,114,.55)" }}>
      <span>ตะกร้า · {count} ชิ้น</span><span className="font-lux font-semibold text-[#e8c472]">{fmt(total)} →</span>
    </Link>
  );
}

/** ขวดจำลอง เมื่อสินค้าไม่มีรูป (ตามบอร์ด) */
const GLOWS: [string, string][] = [["#5a1420", "rgba(194,29,51,.35)"], ["#2a2238", "rgba(140,110,200,.3)"], ["#2f2a14", "rgba(220,200,120,.25)"], ["#3a2a10", "rgba(232,196,114,.65)"], ["#13302a", "rgba(80,180,140,.28)"], ["#1f2a3a", "rgba(110,140,220,.28)"]];
export const glowOf = (id: string) => GLOWS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % GLOWS.length];
export function Bottle({ id, w = 70, h = 110 }: { id: string; w?: number; h?: number }) {
  const [c] = glowOf(id);
  return (
    <svg width={w} height={h} viewBox="0 0 70 110" aria-hidden><rect x="25" y="4" width="20" height="14" rx="3" fill="#e8c472" /><rect x="22" y="16" width="26" height="6" rx="2" fill="#a8862a" /><path d="M14 30c0-5 4-8 9-8h24c5 0 9 3 9 8v68c0 5-4 8-9 8H23c-5 0-9-3-9-8z" fill={c} stroke="#e8c472" strokeWidth="1.2" /><rect x="20" y="48" width="30" height="34" rx="3" fill="#171211" opacity=".55" /><path d="M35 54l4 7h-8z" fill="#e8c472" /><rect x="25" y="66" width="20" height="2" fill="#e8c472" /><rect x="28" y="72" width="14" height="2" fill="#d9c9b4" /></svg>
  );
}

export function FdaPill({ label = "มี อย.", className = "" }: { label?: string; className?: string }) {
  return <span className={`px-[7px] py-0.5 rounded-full bg-[#171211] border border-[#3f8f63] text-[#7fd6a3] text-[11.5px] font-semibold ${className}`}>{label}</span>;
}

export type CardP = Product & { vendor_name?: string; vendor_slug?: string; kind?: string };

export function MProductCard({ p, onAdded }: { p: CardP; onAdded?: (msg: string) => void }) {
  const lines = useCart();
  const qn = lines.find((l) => l.id === p.id)?.qty ?? 0;
  const src = imageUrl(p.images[0]);
  const [, glow] = glowOf(p.id);
  const out = p.stock <= 0;
  const add = () => {
    const n = addToCart(p.id, p.stock);
    onAdded?.(n == null ? `${p.name} ครบจำนวนสูงสุดแล้ว` : `เพิ่ม ${p.name} ลงตะกร้าแล้ว`);
  };
  return (
    <div className="lux-card rounded-2xl bg-[#211a18] border overflow-hidden flex flex-col" style={{ borderColor: LINE }}>
      <Link href={`/products/${p.id}`} aria-label={p.name} className="relative h-[130px] grid place-items-center" style={{ background: `radial-gradient(circle at 50% 40%, ${glow}, #140f0f 70%)` }}>
        {src
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={src} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
          : <Bottle id={p.id} />}
        <FdaPill className="absolute top-2 left-2" label={p.fda_no ? "มี อย." : "รอ อย."} />
        {p.sample && <span className="absolute bottom-2 left-2 px-[7px] py-0.5 rounded-full bg-[#171211]/85 border border-[rgba(232,196,114,.38)] text-[#d9c9b4] text-[10.5px]">ตัวอย่าง</span>}
        {p.age_restricted && <span className="absolute top-2 right-2 px-[7px] py-0.5 rounded-full bg-[#171211] border border-[#b0182c] text-[#ef8a97] text-[11.5px] font-semibold">20+</span>}
      </Link>
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        {p.vendor_name && <Link href={`/shop/${p.vendor_slug || p.vendor_id}`} className="text-[12px] text-[#d9c9b4] py-1">{p.vendor_name}</Link>}
        <Link href={`/products/${p.id}`} className="font-lux font-semibold text-[13.5px] leading-snug text-[#f3ead9]">{p.name}</Link>
        {p.kind && <p className="text-[11.5px] text-[#b5a596]">{p.kind}</p>}
        <div className="flex justify-between items-center mt-auto pt-1.5">
          <span className="font-lux font-semibold text-[#e8c472]">{fmt(p.price)}</span>
          <button type="button" onClick={add} disabled={out} aria-label={`เพิ่ม ${p.name} ลงตะกร้า`}
            className={`h-9 min-w-11 px-2.5 rounded-[10px] border text-white text-xs font-semibold disabled:opacity-50 ${qn || out ? "" : "btn-red-lux"}`}
            style={qn ? { background: "#2f5e45", borderColor: "#3f8f63" } : out ? { background: "#21191a", borderColor: LINE } : { background: RED_GRAD, borderColor: "rgba(232,196,114,.55)" }}>
            {out ? "หมด" : qn ? `ในตะกร้า ${qn}` : "+ ตะกร้า"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** ใช้ใน effect ของ client เพื่อกันค่า SSR mismatch */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
