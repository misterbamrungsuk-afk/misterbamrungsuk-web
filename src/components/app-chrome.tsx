"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TabBar } from "./shell";
import SOSButton from "./sos";

// หน้าแบบเต็มจอ (มีแถบพิมพ์/ปุ่มควบคุมของตัวเองด้านล่าง) ไม่แสดงแถบเมนูลอยและปุ่ม SOS ลอย
// + ฟอร์มย่อยที่มีปุ่มหลักติดล่างจอ (บันทึก/โพสต์/ลบ) — ซ่อนเมนูล่างเพื่อไม่ให้ปุ่มหลักกับ SOS ลอยทับกัน
const FULLSCREEN = [/^\/chat\/[^/]+$/, /^\/call\//, /^\/book\//, /^\/order\//, /^\/report$/, /^\/profile\/addresses$/, /^\/profile\/edit$/, /^\/profile\/delete$/, /^\/jobs\/create$/];
// หน้าที่มีปุ่ม SOS ใหญ่ในหน้าอยู่แล้ว ไม่ต้องมีปุ่มลอยซ้ำ
const OWN_SOS = [/^\/profile$/];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const full = FULLSCREEN.some((re) => re.test(path));
  // ตัวนับบนแท็บแชท = ข้อความใหม่ที่ยังไม่อ่านจริง (แจ้งเตือนชนิด message) · ไม่ได้ล็อกอิน = 0
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (full) return;
    fetch("/api/notifications", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null))
      .then((d: { notices?: { kind: string; read_at: string | null }[] } | null) => setUnread((d?.notices ?? []).filter((n) => n.kind === "message" && !n.read_at).length))
      .catch(() => {});
  }, [path, full]);
  return (
    <div className={`app-frame mb-v7 mb-c ${full ? "" : "safe-bottom"}`}>
      {children}
      {!full && <TabBar unread={unread} />}
      {!full && !OWN_SOS.some((re) => re.test(path)) && <SOSButton />}
    </div>
  );
}
