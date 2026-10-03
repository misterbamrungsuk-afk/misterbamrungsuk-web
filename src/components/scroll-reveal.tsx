"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// เผยเนื้อหาทีละส่วนตอนเลื่อนลง — ใช้ทั้งแอป (การ์ด/section/รายการ) ไม่ต้องใส่ class เองทีละหน้า
const SEL = [".app-frame", "main", ".phone"].flatMap((r) => [`${r} section`, `${r} article`, `${r} .glass`, `${r} li`]).join(", ");

export function ScrollReveal() {
  const path = usePathname();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        el.classList.add("rv-in");
        io.unobserve(el);
      }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    const scan = () => {
      document.querySelectorAll<HTMLElement>(SEL).forEach((el) => {
        if (el.dataset.rv || el.closest("nav, [role=dialog], .fixed, .reveal") || el.parentElement?.closest("[data-rv]")) return;
        el.dataset.rv = "1";
        // ของที่อยู่บนจออยู่แล้วตอนโหลด แสดงทันที (ไม่กระพริบ)
        if (el.getBoundingClientRect().top < window.innerHeight * 0.9) el.classList.add("rv-in", "rv-now");
        else io.observe(el);
      });
    };
    // รอให้ React hydrate เสร็จก่อน (แก้ attribute ก่อน hydrate = hydration mismatch)
    let t = 0;
    const later = () => { clearTimeout(t); t = window.setTimeout(scan, 120); };
    const mo = new MutationObserver(later);
    const start = window.setTimeout(() => { scan(); mo.observe(document.body, { childList: true, subtree: true }); }, 400);
    return () => { clearTimeout(start); clearTimeout(t); io.disconnect(); mo.disconnect(); };
  }, [path]);
  return null;
}
