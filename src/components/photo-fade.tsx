"use client";
/* eslint-disable @next/next/no-img-element */

// รูปบนการ์ดหน้าแรก: เลื่อนรูปที่ Part-Time อัปไว้เองแบบค่อย ๆ จาง (บอส 11 พ.ย. 2569)
// · เปลี่ยนทุก ~4 วินาที (จาง 1.2 วิ) · เริ่มเหลื่อมกันตามลำดับการ์ด (ไม่เปลี่ยนพร้อมกันทั้งหน้า)
// · ปัดนิ้วซ้าย/ขวา (หรือลากเมาส์) = เปลี่ยนรูปเอง ไม่เปิดโปรไฟล์ · ปัดขึ้นลงยังเลื่อนหน้าได้ปกติ
// · จุดด้านล่าง = กดเลือกรูปเอง (ไม่เปิดโปรไฟล์) แล้วพักการเลื่อนอัตโนมัติชั่วครู่
// · เลื่อนเฉพาะการ์ดที่อยู่บนจอ · ผู้ใช้ตั้ง "ลดการเคลื่อนไหว" = ไม่เลื่อนเอง (ยังกดจุดได้)
import { useEffect, useRef, useState } from "react";

const STEP = 4000, FADE = 1200, PAUSE = 9000;

export function PhotoFade({ srcs, alt, pos, delay = 0 }: { srcs: string[]; alt: string; pos?: string; delay?: number }) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(FADE); // ปัด/กดเอง = จางเร็ว · เลื่อนอัตโนมัติ = จางช้า
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
        setFade(FADE);
        setIdx((i) => { const nx = (i + 1) % n; setSeen((s) => Math.max(s, Math.min(n, nx + 2))); return nx; });
      }, STEP);
    }, delay);
    setSeen((s) => Math.max(s, 2));
    return () => { clearTimeout(start); clearInterval(iv); };
  }, [n, onScreen, delay]);

  // ปัดเปลี่ยนรูป: จำจุดเริ่ม → ปล่อยแล้วระยะแนวนอน > 35px และมากกว่าแนวตั้ง = เปลี่ยนรูป + กันคลิกที่ตามมา (ไม่เปิดโปรไฟล์)
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const go = (i: number) => {
    const nx = ((i % n) + n) % n;
    hold.current = Date.now() + PAUSE;
    setSeen((s) => Math.max(s, Math.min(n, nx + 2)));
    setFade(450);
    setIdx(nx);
  };
  const onDown = (e: React.PointerEvent) => { if (n < 2) return; start.current = { x: e.clientX, y: e.clientY }; swiped.current = false; };
  const onUp = (e: React.PointerEvent) => {
    const s0 = start.current; start.current = null;
    if (!s0) return;
    const dx = e.clientX - s0.x, dy = e.clientY - s0.y;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.2) { swiped.current = true; go(idx + (dx < 0 ? 1 : -1)); }
  };
  const onClickCapture = (e: React.MouseEvent) => { if (swiped.current) { e.preventDefault(); e.stopPropagation(); swiped.current = false; } };

  const pick = (e: React.MouseEvent, i: number) => {
    e.preventDefault(); e.stopPropagation();
    hold.current = Date.now() + PAUSE;
    setSeen((s) => Math.max(s, Math.min(n, i + 2)));
    setFade(450);
    setIdx(i);
  };

  return (
    <div ref={box} className="absolute inset-0 select-none" style={n > 1 ? { touchAction: "pan-y" } : undefined}
      onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { start.current = null; }} onClickCapture={onClickCapture} onDragStart={(e) => e.preventDefault()}>
      {srcs.slice(0, Math.max(seen, idx + 1)).map((src, i) => (
        <img key={src} src={src} alt={i === 0 ? alt : ""} loading={i === 0 ? "lazy" : "eager"} decoding="async"
          draggable={false} className="absolute inset-0 w-full h-full object-cover block"
          style={{ opacity: i === idx ? 1 : 0, transition: `opacity ${fade}ms ease-in-out`, ...(i === 0 && pos ? { objectPosition: pos } : {}) }} />
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
