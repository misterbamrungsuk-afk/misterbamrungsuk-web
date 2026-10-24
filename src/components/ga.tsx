"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { hasConsent, onConsentChange } from "@/lib/consent";

// Google Analytics 4 — วัดจำนวนคนเข้าเว็บ / ที่มาจากการโปรโมท (utm_source ฯลฯ) (MDG/M ขอ 24 ต.ค. 2569)
// โหลดเฉพาะเมื่อ (1) ตั้งรหัส GA (G-XXXX) แล้ว และ (2) ผู้ใช้ยินยอม "วิเคราะห์การใช้งาน" ในแบนเนอร์คุกกี้ (PDPA) · ไม่โหลดในหน้าแอดมิน
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
type W = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };

function load(id: string) {
  const w = window as W;
  if (w.gtag) return;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() { (w.dataLayer as unknown[]).push(arguments); }; // eslint-disable-line prefer-rest-params
  w.gtag("js", new Date());
  // page_view ส่งเองทุกครั้งที่เปลี่ยนหน้า (Next.js เปลี่ยนหน้าแบบไม่โหลดใหม่)
  w.gtag("config", id, { send_page_view: false, anonymize_ip: true });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

export function GoogleAnalytics() {
  const path = usePathname();
  const sp = useSearchParams();
  const on = useRef(false);
  const last = useRef(""); // กันส่ง page_view ซ้ำหน้าเดิม
  const staff = !!path && (path === "/admin" || path.startsWith("/admin/") || path.startsWith("/admin-login"));
  const send = () => {
    const w = window as W;
    const page = path + (sp.toString() ? `?${sp}` : "");
    if (!on.current || !w.gtag || staff || last.current === page) return;
    last.current = page;
    w.gtag("event", "page_view", { page_path: page, page_location: location.href, page_title: document.title });
  };
  useEffect(() => {
    if (!GA_ID || staff) return;
    const start = () => { if (on.current) return; on.current = true; load(GA_ID); send(); };
    if (hasConsent("analytics")) start();
    return onConsentChange((c) => { if (c.analytics) start(); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { send(); }, [path, sp]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
