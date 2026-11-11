"use client";
/* eslint-disable @next/next/no-img-element */

// รูปบนการ์ดหน้าแรก: เลื่อนรูปที่ Part-Time อัปไว้เองแบบค่อย ๆ จาง (บอส 11 พ.ย. 2569)
// · เปลี่ยนทุก ~4 วินาที (จาง 1.2 วิ) · เริ่มเหลื่อมกันตามลำดับการ์ด (ไม่เปลี่ยนพร้อมกันทั้งหน้า)
// · จุดด้านล่าง = กดเลือกรูปเอง (ไม่เปิดโปรไฟล์) แล้วพักการเลื่อนอัตโนมัติชั่วครู่
// · เลื่อนเฉพาะการ์ดที่อยู่บนจอ · ผู้ใช้ตั้ง "ลดการเคลื่อนไหว" = ไม่เลื่อนเอง (ยังกดจุดได้)
import { useEffect, useRef, useState } from "react";

const STEP = 4000, FADE = 1200, PAUSE = 9000;

export function PhotoFade({ srcs, alt, pos, delay = 0 }: { srcs: string[]; alt: string; pos?: string; delay?: number }) {
  const [idx, setIdx] = useState(0);
  const [seen, setSeen] = useState(1); // โหลดรูปถัดไปเมื่อใกล้ถึงเท่านั้น
  const [onScreen, setOnScreen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const hold = useRef(0);
  const n = srcs.length;

  useEffect(() => {
    if (n < 2 || !box.current) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.35 });
    io.observe(box.current);
    return () => io.disconnect();
  }, [n]);

  useEffect(() => {
    if (n < 2 || !onScreen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let iv = 0;
    const start = window.setTimeout(() => {
      iv = window.setInterval(() => {
        if (Date.now() < hold.current || document.hidden) return;
        setIdx((i) => { const nx = (i + 1) % n; setSeen((s) => Math.max(s, Math.min(n, nx + 2))); return nx; });
      }, STEP);
    }, delay);
    setSeen((s) => Math.max(s, 2));
    return () => { clearTimeout(start); clearInterval(iv); };
  }, [n, onScreen, delay]);

  const pick = (e: React.MouseEvent, i: number) => {
    e.preventDefault(); e.stopPropagation();
    hold.current = Date.now() + PAUSE;
    setSeen((s) => Math.max(s, Math.min(n, i + 2)));
    setIdx(i);
  };

  return (
    <div ref={box} className="absolute inset-0">
      {srcs.slice(0, Math.max(seen, idx + 1)).map((src, i) => (
        <img key={src} src={src} alt={i === 0 ? alt : ""} loading={i === 0 ? "lazy" : "eager"} decoding="async"
          className="absolute inset-0 w-full h-full object-cover block"
          style={{ opacity: i === idx ? 1 : 0, transition: `opacity ${FADE}ms ease-in-out`, ...(i === 0 && pos ? { objectPosition: pos } : {}) }} />
      ))}
      {n > 1 && (
        <div data-photo-dots className="absolute right-2 bottom-2 z-[2] flex gap-1.5 items-center rounded-full px-1.5 py-1" style={{ background: "rgba(0,0,0,.28)" }}>
          {srcs.map((src, i) => (
            <button key={src} type="button" onClick={(e) => pick(e, i)} aria-label={`รูปที่ ${i + 1}`} aria-pressed={i === idx}
              className="block rounded-full p-0" style={{ width: i === idx ? 14 : 6, height: 6, background: i === idx ? "#e8c472" : "rgba(255,255,255,.7)", transition: "width .3s, background .3s" }} />
          ))}
        </div>
      )}
    </div>
  );
}
