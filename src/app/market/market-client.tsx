"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { imageUrl, type Banner } from "@/lib/market/config";
import { CartBar, Chip, LINE, MProductCard, Toast, useToast, type CardP } from "../products/m-kit";

// แบนเนอร์โปรโมชัน (แอดมินจัดการ) — เลื่อนเองทุก 5 วิ + ปุ่ม ‹ › + จุด (ตามบอร์ด Market)
export function MarketBanner({ banners, fallback }: { banners: Banner[]; fallback: string[] }) {
  const [i, setI] = useState(0);
  const n = banners.length;
  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n]);
  const b = banners[i % n];
  const src = (b.image && (imageUrl(b.image) || b.image)) || fallback[i % fallback.length];
  const body = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
      {(b.title || b.subtitle) && (
        <>
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(14,10,10,.92) 30%, rgba(14,10,10,.15))" }} />
          <div className="absolute left-4 top-4 right-[110px]">
            <p className="text-[11.5px] tracking-[2.5px] text-[#e8c472] font-semibold">PROMOTION</p>
            <p className="font-lux font-semibold text-[17px] leading-snug mt-0.5">{b.title}</p>
            {b.subtitle && <p className="text-xs text-[#d9c9b4] mt-0.5 line-clamp-2">{b.subtitle}</p>}
          </div>
          {b.link && <span className="absolute left-4 bottom-3 min-h-8 px-3 rounded-full border border-[#e8c472] bg-[rgba(14,10,10,.6)] text-[#e8c472] text-xs font-semibold inline-flex items-center">ดูเลย →</span>}
        </>
      )}
    </>
  );
  return (
    <div className="mx-[18px] mt-3.5 relative h-[132px] rounded-[18px] overflow-hidden border" style={{ borderColor: LINE }} aria-roledescription="carousel" aria-label="โปรโมชัน">
      {b.link ? <Link href={b.link} className="absolute inset-0 text-[#f3ead9]">{body}</Link> : body}
      {n > 1 && (
        <div className="absolute right-2 bottom-1.5 flex items-center z-10">
          <button type="button" onClick={() => setI((i + n - 1) % n)} aria-label="โปรก่อนหน้า" className="w-9 h-9 text-white text-lg">‹</button>
          {banners.map((x, k) => (
            <button key={x.id} type="button" onClick={() => setI(k)} aria-label={`โปรที่ ${k + 1}`} className="w-3.5 h-9 grid place-items-center">
              <span className="h-1.5 rounded-[3px]" style={{ width: k === i ? 14 : 6, background: k === i ? "#e8c472" : "rgba(246,239,228,.45)" }} />
            </button>
          ))}
          <button type="button" onClick={() => setI((i + 1) % n)} aria-label="โปรถัดไป" className="w-9 h-9 text-white text-lg">›</button>
        </div>
      )}
    </div>
  );
}

// สินค้าคัดสรร — ชิปหมวด + 4 รายการ + แถบตะกร้า
export function MarketShop({ products, categories }: { products: CardP[]; categories: { id: string; name: string; slug: string }[] }) {
  const [cat, setCat] = useState("all");
  const { text, flash } = useToast();
  const list = products.filter((p) => cat === "all" || p.category_id === cat).slice(0, 4);
  const c = categories.find((x) => x.id === cat);
  return (
    <>
      <div className="px-[18px] pb-2.5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="หมวดหมู่สินค้า">
          <Chip on={cat === "all"} onClick={() => setCat("all")}>ทั้งหมด</Chip>
          {categories.map((x) => <Chip key={x.id} on={cat === x.id} onClick={() => setCat(x.id)}>{x.name}</Chip>)}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 px-[18px]">
        {list.map((p) => <MProductCard key={p.id} p={p} onAdded={flash} />)}
      </div>
      {!list.length && <p className="px-[18px] text-[13px] text-[#d9c9b4]">ยังไม่มีสินค้าในหมวดนี้</p>}
      <div className="px-[18px] pt-2.5">
        <Link href={c ? `/products?cat=${c.slug}` : "/products"} className="h-12 rounded-[14px] border bg-[#211a18] text-[#e8c472] text-sm font-semibold grid place-items-center" style={{ borderColor: LINE }}>ดูสินค้าทั้งหมด {c ? `· ${c.name}` : ""}</Link>
      </div>
      <Toast text={text} />
      <CartBar prices={Object.fromEntries(products.map((p) => [p.id, p.price]))} />
    </>
  );
}
