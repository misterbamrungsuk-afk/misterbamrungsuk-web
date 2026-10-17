"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type CSSProperties, type ReactNode } from "react";

// ปุ่มย้อนกลับของหน้าที่เข้าได้หลายทาง (หน้าแรก/ป๊อปอัป/โปรไฟล์/ลิงก์ภายนอก):
// เคยเปิดหน้าอื่นของเว็บในแท็บนี้มาก่อน → กลับไปหน้าที่มาจริง · เปิดตรงจากลิงก์ → ไปหน้า fallback
const KEY = "mb_nav_depth";

/** ใส่ครั้งเดียวใน layout — นับจำนวนหน้าที่เปิดในแท็บนี้ */
export function NavTrack() {
  const path = usePathname();
  useEffect(() => {
    try { sessionStorage.setItem(KEY, String(Number(sessionStorage.getItem(KEY) || 0) + 1)); } catch {}
  }, [path]);
  return null;
}

export function canGoBack() {
  try { return Number(sessionStorage.getItem(KEY) || 0) > 1 && window.history.length > 1; } catch { return false; }
}

export function SmartBack({ href, className, style, children, label = "ย้อนกลับ" }: { href: string; className?: string; style?: CSSProperties; children: ReactNode; label?: string }) {
  const router = useRouter();
  return (
    <Link href={href} aria-label={label} className={className} style={style}
      onClick={(e) => { if (canGoBack()) { e.preventDefault(); router.back(); } }}>
      {children}
    </Link>
  );
}
