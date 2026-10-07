"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { baht, imageUrl } from "@/lib/market/config";

type P = { id: string; name: string; price: number; image: string | null };

// แถบ "สินค้าแนะนำ" เล็ก ๆ หลังจองสำเร็จ — best effort: โหลดไม่ได้ก็ไม่แสดงอะไร
export function RecommendStrip() {
  const [items, setItems] = useState<P[]>([]);
  useEffect(() => {
    fetch("/api/market/recommend").then((r) => (r.ok ? r.json() : null)).then((d: { products?: P[] } | null) => setItems(d?.products ?? [])).catch(() => {});
  }, []);
  if (!items.length) return null;
  return (
    <section className="w-full mt-6 text-left">
      <div className="flex items-baseline mb-2">
        <p className="text-sm font-semibold">สินค้าแนะนำ</p>
        <Link href="/products" className="ml-auto text-xs text-gold-300">ดูทั้งหมด →</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {items.map((p) => (
          <Link key={p.id} href={`/products/${p.id}`} className="shrink-0 w-32 rounded-2xl border border-ink-600 bg-ink-800 overflow-hidden">
            {p.image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={imageUrl(p.image)} alt="" className="w-full aspect-square object-cover" />
              : <div className="w-full aspect-square grid place-items-center bg-[linear-gradient(135deg,#2a1414,#120c0c)] text-gold-400 font-display text-xl">{p.name.slice(0, 1)}</div>}
            <div className="p-2"><p className="text-xs leading-snug line-clamp-2">{p.name}</p><p className="text-xs font-semibold text-gold-300 mt-1">฿{baht(p.price)}</p></div>
          </Link>
        ))}
      </div>
      <p className="text-[11px] text-ink-400 mt-1">แพ็กมิดชิด ไม่ระบุชื่อสินค้าหน้ากล่อง</p>
    </section>
  );
}
