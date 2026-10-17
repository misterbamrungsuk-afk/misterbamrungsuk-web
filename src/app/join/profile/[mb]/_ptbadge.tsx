"use client";

// จุดแจ้งเตือนที่ยังไม่อ่าน (เมนู Part-Time) — ดึงจำนวนจาก /api/pt/notifications?count=1 ตอนเปิดหน้า + ทุก 60 วิ ขณะเปิดดูอยู่
import { useEffect, useState } from "react";

export function NoticeBadge({ mb, q, initial }: { mb: string; q: string; initial?: number }) {
  const [n, setN] = useState(initial ?? 0);
  useEffect(() => {
    if (initial !== undefined) return; // หน้าที่ส่งจำนวนมาแล้ว (หน้าหลัก) ไม่ต้องดึงซ้ำ
    const load = () => fetch(`/api/pt/notifications?mb=${encodeURIComponent(mb)}&count=1${q ? `&${q.slice(1)}` : ""}`, { cache: "no-store" }).then((r) => r.json()).then((d) => { if (d?.ok) setN(d.unread); }).catch(() => {});
    load();
    const tick = () => { if (document.visibilityState === "visible") load(); };
    const i = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(i); document.removeEventListener("visibilitychange", tick); };
  }, [mb, q, initial]);
  if (!n) return null;
  return <span aria-label={`แจ้งเตือนใหม่ ${n} รายการ`} className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#d93a3a] text-white text-[11px] font-bold leading-[18px] text-center">{n > 9 ? "9+" : n}</span>;
}
