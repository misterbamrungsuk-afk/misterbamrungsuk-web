"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { hasConsent, onConsentChange } from "@/lib/consent";

// Google Analytics 4 — วัดจำนวนคนเข้าเว็บ / ที่มาจากการโปรโมท (utm_source ฯลฯ) (MDG/M ขอ 24 ต.ค. 2569)
// Property "misterbamrungsuk.com" ในบัญชี misterbamrungsuk@gmail.com · รหัสสาธารณะ (ไม่ใช่คีย์ลับ) · เปลี่ยนได้ด้วย env NEXT_PUBLIC_GA_ID
// โหลดเฉพาะเมื่อผู้ใช้ยินยอม "วิเคราะห์การใช้งาน" ในแบนเนอร์คุกกี้ (PDPA) · ไม่โหลดในหน้าแอดมิน
// page_view: หน้าแรกส่งตอน config · เปลี่ยนหน้าในแอป (Next.js) ส่งจากโค้ด — ใน GA ปิด "Page changes based on browser history events" แล้ว (กันนับซ้ำ)
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-D36RHJT6HM";
type W = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };

function load(id: string) {
  const w = window as W;
  if (w.gtag) return;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() { (w.dataLayer as unknown[]).push(arguments); }; // eslint-disable-line prefer-rest-params
  w.gtag("js", new Date());
  w.gtag("config", id, { anonymize_ip: true });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

export function GoogleAnalytics() {
  const path = usePathname();
  const staff = !!path && (path === "/admin" || path.startsWith("/admin/") || path.startsWith("/admin-login"));
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!GA_ID || staff) return;
    const start = () => { if (!(window as W).gtag) { load(GA_ID); last.current = location.pathname + location.search; } };
    if (hasConsent("analytics")) start();
    return onConsentChange((c) => { if (c.analytics) start(); });
  }, [staff]);
  // เปลี่ยนหน้าภายในแอป → page_view (หน้าแรกส่งไปแล้วตอน config)
  useEffect(() => {
    const w = window as W;
    if (!w.gtag || staff) return;
    const page = location.pathname + location.search;
    if (last.current === page) return;
    last.current = page;
    w.gtag("event", "page_view", { page_location: location.href, page_path: page, page_title: document.title });
  }, [path, staff]);
  return null;
}
