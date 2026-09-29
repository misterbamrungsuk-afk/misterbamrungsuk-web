"use client";

import { useEffect } from "react";

// ลงทะเบียน service worker (PWA) เฉพาะ production — dev ไม่แคช จะได้ไม่ค้างของเก่า
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
