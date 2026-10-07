"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui";
import { CART_KEY, MAX_QTY, type CartLine } from "@/lib/market/config";

// ── ตะกร้า (localStorage) ──
export function readCart(): CartLine[] {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as CartLine[];
    return Array.isArray(v) ? v.filter((l) => typeof l.id === "string" && l.qty > 0) : [];
  } catch { return []; }
}
export function writeCart(lines: CartLine[]) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch {}
  window.dispatchEvent(new Event("mb-cart"));
}
export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  useEffect(() => {
    const sync = () => setLines(readCart());
    sync();
    window.addEventListener("mb-cart", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("mb-cart", sync); window.removeEventListener("storage", sync); };
  }, []);
  return lines;
}

export function AddToCart({ id, stock, className = "" }: { id: string; stock: number; className?: string }) {
  const [added, setAdded] = useState(false);
  if (stock <= 0) return <button disabled className={`btn-ghost rounded-full opacity-60 ${className}`}>สินค้าหมด</button>;
  const add = () => {
    const lines = readCart();
    const l = lines.find((x) => x.id === id);
    if (l) l.qty = Math.min(MAX_QTY, stock, l.qty + 1); else lines.push({ id, qty: 1 });
    writeCart(lines);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };
  return (
    <button type="button" onClick={add} className={`btn-crimson rounded-full font-semibold ${className}`}>
      {added ? "✓ ใส่ตะกร้าแล้ว" : "ใส่ตะกร้า"}
    </button>
  );
}

export function MarketHeader() {
  const n = useCart().reduce((s, l) => s + l.qty, 0);
  return (
    <header className="sticky top-0 z-30 bg-ink-900/90 backdrop-blur-xl border-b border-ink-600">
      <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 h-14">
        <Link href="/" aria-label="หน้าแรก"><Logo size={28} /></Link>
        <span className="hidden sm:inline text-[11px] font-semibold tracking-[0.2em] text-gold-500">MARKETPLACE</span>
        <nav className="ml-auto flex items-center gap-2">
          <Link href="/products" className="hidden sm:inline-flex h-9 px-3 items-center text-sm text-ink-300 hover:text-ink-100">สินค้า</Link>
          <Link href="/cart" className="relative h-9 px-4 rounded-full border border-ink-600 inline-flex items-center text-sm hover:border-gold-500">
            ตะกร้า
            {n > 0 && <span className="ml-2 min-w-5 h-5 px-1.5 rounded-full bg-crimson-500 text-white text-[11px] grid place-items-center">{n}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
