"use client";

import { useEffect } from "react";

// สคริปต์ในหัวหน้า: เก็บ error ที่เกิดก่อน React พร้อม (ระหว่าง hydrate) ไว้ใน window.__mbErrQ
export const EARLY_ERROR_SCRIPT = `window.__mbErrQ=[];window.__mbErrH=function(e){var r=e.reason;window.__mbErrQ&&window.__mbErrQ.length<10&&window.__mbErrQ.push(e.type==="error"?[e.message||"",e.error&&e.error.stack||""]:["promise:"+(r&&r.message||String(r)),r&&r.stack||""])};addEventListener("error",window.__mbErrH);addEventListener("unhandledrejection",window.__mbErrH);`;

// ส่ง error ที่เกิดในเบราว์เซอร์ผู้ใช้กลับมาให้ทีม (หน้า /admin/errors) — ไม่ส่งข้อมูลส่วนตัว · สูงสุด 5 ครั้งต่อการเปิดหน้า
export function ErrorReporter() {
  useEffect(() => {
    let sent = 0;
    const seen = new Set<string>();
    const send = (kind: string, message: string, stack = "") => {
      const k = kind + message.slice(0, 120);
      if (sent >= 5 || seen.has(k) || !message) return;
      seen.add(k); sent++;
      const body = JSON.stringify({
        kind, message: message.slice(0, 400), stack: stack.slice(0, 800), path: location.pathname,
        vw: innerWidth, vh: innerHeight, sw: !!navigator.serviceWorker?.controller, ms: Math.round(performance.now()),
      });
      try { if (!navigator.sendBeacon?.("/api/client-log", new Blob([body], { type: "application/json" }))) throw 0; }
      catch { fetch("/api/client-log", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {}); }
    };
    const onErr = (e: ErrorEvent) => send(/#41[89]|#42[3-5]|hydrat/i.test(e.message) ? "hydration" : "error", e.message || String(e.error), e.error?.stack ?? "");
    const onRej = (e: PromiseRejectionEvent) => { const r = e.reason as { message?: string; stack?: string } | undefined; send("promise", r?.message ?? String(e.reason), r?.stack ?? ""); };
    // ถอดตัวจับชั่วคราวในหัวหน้า แล้วส่งของที่ค้างในคิว
    const w = window as unknown as { __mbErrQ?: [string, string][]; __mbErrH?: EventListener };
    if (w.__mbErrH) { removeEventListener("error", w.__mbErrH); removeEventListener("unhandledrejection", w.__mbErrH); }
    for (const [m, st] of w.__mbErrQ ?? []) m.startsWith("promise:") ? send("promise", m.slice(8), st) : send(/#41[89]|#42[3-5]|hydrat/i.test(m) ? "hydration" : "error", m, st);
    w.__mbErrQ = undefined;
    addEventListener("error", onErr);
    addEventListener("unhandledrejection", onRej);
    return () => { removeEventListener("error", onErr); removeEventListener("unhandledrejection", onRej); };
  }, []);
  return null;
}
