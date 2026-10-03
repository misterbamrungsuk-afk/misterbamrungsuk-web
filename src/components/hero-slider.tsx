"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Post } from "@/lib/types";
import { baht } from "@/components/ui";
import { queueLabel } from "@/lib/membership";
import { catBySlug } from "@/lib/categories";

// สไลด์ "หมอแนะนำ" หน้าแรก — ปัดได้ + เลื่อนเองทุก 5 วิ
export function HeroSlider({ posts, lang }: { posts: Post[]; lang: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const th = lang === "th";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setI(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (posts.length < 2) return;
    const t = setInterval(() => {
      const el = ref.current;
      if (!el) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % posts.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 5000);
    return () => clearInterval(t);
  }, [posts.length]);

  const go = (n: number) => ref.current?.scrollTo({ left: n * ref.current.clientWidth, behavior: "smooth" });

  return (
    <section className="px-4 pt-3">
      <div className="flex items-end justify-between mb-2.5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#8f5e00] flex items-center gap-2"><span className="w-5 h-px bg-[#b8860b]" />{th ? "หมอแนะนำ" : "RECOMMENDED"}</p>
          <h2 className="font-display text-[20px] font-bold mt-0.5">{th ? "คัดมาเพื่อคุณวันนี้" : "Picked for you today"}</h2>
        </div>
        <span className="text-xs text-ink-400">{i + 1}/{posts.length}</span>
      </div>

      <div ref={ref} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[28px]">
        {posts.map((p) => {
          const avail = queueLabel(p, th);
          return (
            <Link key={p.id} href={`/post/${p.id}`} className="relative snap-center shrink-0 w-full h-[400px] rounded-[28px] overflow-hidden bg-ink-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.images[0]} alt={p.member.name} className="absolute inset-0 w-full h-full object-cover object-[50%_25%]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
              <div className="absolute top-3 left-3 flex gap-1.5">
                {p.member.kycVerified && <span className="h-7 px-2.5 rounded-full bg-white/95 text-[11.5px] font-semibold text-ink-100 flex items-center gap-1 shadow-sm"><span className="text-emerald-600">✓</span>{th ? "ยืนยันตัวตน" : "Verified"}</span>}
                {avail && <span className="h-7 px-2.5 rounded-full bg-white/95 text-[11.5px] font-semibold text-ink-100 flex items-center gap-1 shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{avail}</span>}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <div className="flex items-center gap-2">
                  <p className="font-display text-[26px] font-bold leading-none">{p.member.name}, {p.member.age}</p>
                  {p.rating != null && <span className="h-6 px-2 rounded-full bg-white/95 text-ink-100 text-[11.5px] font-bold flex items-center gap-0.5"><span className="text-amber-500">★</span>{p.rating.toFixed(1)}</span>}
                </div>
                <p className="text-[13px] text-white/80 mt-1.5 truncate">{p.categories.slice(0, 2).map((c) => { const k = catBySlug(c); return k ? (th ? k.th : k.en) : c; }).join(" · ")} · {p.province}</p>
                <div className="mt-4 flex items-center justify-between">
                  <p className="font-display text-[22px] font-bold text-[#f3d27a]">{baht(p.pricePerHour)}<span className="text-[12px] font-sans font-normal text-white/70"> /{th ? "ชม." : "hr"}</span></p>
                  <span className="h-11 px-5 rounded-full bg-[linear-gradient(180deg,#e8293f,#c8142a)] text-white text-[14px] font-semibold flex items-center gap-1.5 shadow-[0_6px_16px_rgba(215,25,47,.35)]">{th ? "ดูโปรไฟล์" : "View"} →</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex justify-center gap-1.5 mt-3">
        {posts.map((p, n) => (
          <button key={p.id} onClick={() => go(n)} aria-label={`slide ${n + 1}`} className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-crimson-500" : "w-1.5 bg-ink-500"}`} />
        ))}
      </div>
    </section>
  );
}
