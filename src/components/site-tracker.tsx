"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { readConsent } from "@/lib/consent";

// นับผู้เข้าชม (ของเราเอง → /admin/traffic) — เปิดหน้า = 1 รายการ · ออกจากหน้า/สลับแท็บ = ส่งเวลาที่อยู่หน้า
// ไม่ยินยอมคุกกี้วิเคราะห์: นับแบบไม่ระบุตัวตน (รหัสรอบชั่วคราวใน sessionStorage · หายเมื่อปิดแท็บ)
// ยินยอม: เพิ่มรหัสผู้เข้าชมซ้ำ (localStorage) + ผู้ใช้ที่ล็อกอิน (เซิร์ฟเวอร์อ่านจากคุกกี้เอง) · ไม่นับหน้าแอดมิน
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 20);
const store = (s: Storage | null, k: string) => { try { if (!s) return rid(); const v = s.getItem(k); if (v) return v; const n = rid(); s.setItem(k, n); return n; } catch { return rid(); } };
const send = (body: Record<string, unknown>) => {
  const data = JSON.stringify(body);
  try { if (navigator.sendBeacon?.("/api/t", new Blob([data], { type: "text/plain" }))) return; } catch {}
  fetch("/api/t", { method: "POST", body: data, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => {});
};

export function SiteTracker() {
  const path = usePathname();
  const cur = useRef<{ v: string; sid: string; start: number; hidden: number; hiddenAt: number | null } | null>(null);
  const flush = () => {
    const c = cur.current;
    if (!c) return;
    const now = Date.now(), away = c.hidden + (c.hiddenAt ? now - c.hiddenAt : 0);
    send({ t: "d", v: c.v, sid: c.sid, ms: now - c.start - away });
    cur.current = null;
  };
  useEffect(() => {
    if (!path || path.startsWith("/admin") || path === "/ceo") return;
    flush();
    const c = readConsent();
    const a = !!c?.analytics;
    const sid = store(typeof sessionStorage === "undefined" ? null : sessionStorage, "mb_sid");
    const v = crypto.randomUUID();
    const q = new URLSearchParams(location.search);
    send({
      t: "v", v, sid, p: path, r: document.referrer || null, a: a ? 1 : 0, m: c?.marketing ? 1 : 0,
      vid: a ? store(typeof localStorage === "undefined" ? null : localStorage, "mb_vid") : null,
      us: q.get("utm_source"), um: q.get("utm_medium"), uc: q.get("utm_campaign"),
    });
    cur.current = { v, sid, start: Date.now(), hidden: 0, hiddenAt: null };
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // ซ่อนแท็บ = หยุดนับเวลา · ปิด/ออกจากหน้า = ส่งเวลา
    const vis = () => { const c = cur.current; if (!c) return; if (document.hidden) c.hiddenAt = Date.now(); else if (c.hiddenAt) { c.hidden += Date.now() - c.hiddenAt; c.hiddenAt = null; } };
    const leave = () => flush();
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("pagehide", leave);
    return () => { document.removeEventListener("visibilitychange", vis); window.removeEventListener("pagehide", leave); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
