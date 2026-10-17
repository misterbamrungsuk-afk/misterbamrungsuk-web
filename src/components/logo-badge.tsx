/* eslint-disable @next/next/no-img-element */
import type { Logo } from "@/lib/avatar";

// โลโก้วงกลม (พาร์ทเนอร์/ร้านค้า) — ตำแหน่ง+ซูมตามที่เจ้าของจัดไว้
export function LogoBadge({ logo, size = 40, className = "" }: { logo: Logo; size?: number; className?: string }) {
  return (
    <span className={`relative inline-block shrink-0 rounded-full overflow-hidden bg-[#251d1b] ${className}`} style={{ width: size, height: size, border: "2px solid #e8c472", boxShadow: "0 2px 8px rgba(0,0,0,.45)" }}>
      <img src={logo.src} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: logo.pos, transform: `scale(${logo.zoom})`, transformOrigin: logo.pos }} />
    </span>
  );
}
