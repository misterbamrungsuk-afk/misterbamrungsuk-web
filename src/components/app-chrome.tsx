"use client";

import { usePathname } from "next/navigation";
import { TabBar } from "./shell";
import SOSButton from "./sos";

// หน้าแบบเต็มจอ (มีแถบพิมพ์/ปุ่มควบคุมของตัวเองด้านล่าง) ไม่แสดงแถบเมนูลอยและปุ่ม SOS ลอย
const FULLSCREEN = [/^\/chat\/[^/]+$/, /^\/call\//, /^\/book\//, /^\/order\//];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const full = FULLSCREEN.some((re) => re.test(path));
  return (
    <div className={`app-frame mb-v7 mb-c ${full ? "" : "safe-bottom"}`}>
      {children}
      {!full && <TabBar unread={1} />}
      {!full && <SOSButton />}
    </div>
  );
}
