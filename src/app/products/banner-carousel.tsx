"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { imageUrl, type Banner } from "@/lib/market/config";

// แบนเนอร์โปรโมชั่นหน้าแรก (แอดมินจัดการที่ /admin/market) — เลื่อนเองทุก 5 วิ, ปัดได้
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const n = banners.length;
  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n]);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
  }, [i]);
  if (!n) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 pt-6" aria-roledescription="carousel" aria-label="โปรโมชั่น">
      <div ref={ref} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-3xl"
        onScroll={(e) => { const el = e.currentTarget; const k = Math.round(el.scrollLeft / Math.max(1, el.clientWidth)); if (k !== i) setI(k); }}>
        {banners.map((b) => {
          const img = imageUrl(b.image);
          const inner = (
            <div className="relative h-44 sm:h-56 lg:h-64 w-full overflow-hidden rounded-3xl border border-gold-500/30">
              {img
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                : <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.25),transparent_60%),linear-gradient(135deg,#2a1014,#0e0a0a)]" />}
              <div className="absolute inset-0 bg-gradient-to-r from-ink-950/85 via-ink-950/40 to-transparent" />
              <div className="relative h-full flex flex-col justify-center px-6 lg:px-10 max-w-xl">
                <p className="text-[11px] font-semibold tracking-[0.3em] text-gold-500">PROMOTION</p>
                <h2 className="text-xl lg:text-3xl font-semibold mt-2 leading-snug">{b.title}</h2>
                {b.subtitle && <p className="text-sm text-ink-200 mt-2">{b.subtitle}</p>}
              </div>
            </div>
          );
          return <div key={b.id} className="snap-start shrink-0 w-full">{b.link ? <Link href={b.link}>{inner}</Link> : inner}</div>;
        })}
      </div>
      {n > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {banners.map((b, k) => <button key={b.id} type="button" aria-label={`แบนเนอร์ ${k + 1}`} onClick={() => setI(k)} className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-gold-500" : "w-3 bg-ink-600"}`} />)}
        </div>
      )}
    </section>
  );
}
