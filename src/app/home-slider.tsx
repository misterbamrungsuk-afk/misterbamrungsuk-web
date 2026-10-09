"use client";

import { useState } from "react";

const SLIDES = [
  { src: "/brand/cover.jpg", alt: "ประกาศรับสมัคร Part-time Mister Bamrungsuk · รายได้สูง บริการลูกค้าระดับ VVIP" },
  { src: "/brand/cover2.jpg", alt: "ประกาศรับสมัคร Part-time Mister Bamrungsuk · รายได้สูง พบลูกค้าระดับ VVIP พัฒนาทักษะงานบริการ" },
];

const arrow = "absolute top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-[rgba(240,200,90,.7)] bg-black/50 text-[#ffd76a] text-[18px] cursor-pointer";

export function HomeSlider() {
  const n = SLIDES.length;
  const [i, setI] = useState(0);
  const go = (k: number) => setI((k + n) % n);
  return (
    <div className="relative overflow-hidden">
      <div className="flex w-[200%] transition-transform duration-[450ms] ease-in-out" style={{ transform: `translateX(${-50 * i}%)` }}>
        {SLIDES.map((s) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={s.src} src={s.src} alt={s.alt} className="w-1/2 block" />
        ))}
      </div>
      <button type="button" onClick={() => go(i - 1)} aria-label="ภาพก่อนหน้า" className={`${arrow} left-2`}>‹</button>
      <button type="button" onClick={() => go(i + 1)} aria-label="ภาพถัดไป" className={`${arrow} right-2`}>›</button>
      <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
        {SLIDES.map((_, k) => (
          <button key={k} type="button" onClick={() => go(k)} aria-label={`ภาพที่ ${k + 1}`} className="h-2 rounded border-0 p-0 cursor-pointer transition-all" style={{ width: k === i ? 22 : 8, background: k === i ? "#f0c75a" : "rgba(255,255,255,.5)" }} />
        ))}
      </div>
    </div>
  );
}
