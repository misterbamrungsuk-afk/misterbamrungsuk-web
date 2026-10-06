"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<void> | null = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  return (loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC; s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error("turnstile load failed")); };
    document.head.appendChild(s);
  }));
}

/** วิดเจ็ต Cloudflare Turnstile — ไม่ตั้ง NEXT_PUBLIC_TURNSTILE_SITE_KEY จะไม่แสดง (เซิร์ฟเวอร์ข้ามการตรวจ) */
export function Turnstile({ onToken, className = "" }: { onToken: (token: string) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !ref.current) return;
    let id = "";
    let alive = true;
    loadScript().then(() => {
      if (!alive || !ref.current || !window.turnstile) return;
      id = window.turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY, theme: "dark", language: "th",
        callback: (t: string) => cb.current(t),
        "expired-callback": () => cb.current(""),
        "error-callback": () => cb.current(""),
      });
    }).catch(() => {});
    return () => { alive = false; if (id) window.turnstile?.remove(id); };
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className={className} />;
}
