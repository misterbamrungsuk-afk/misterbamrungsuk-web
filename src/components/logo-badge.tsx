/* eslint-disable @next/next/no-img-element */
import type { Logo } from "@/lib/avatar";
import { sized } from "@/lib/thumb-url";

// โลโก้วงกลม (พาร์ทเนอร์/ร้านค้า) — ตำแหน่ง+ซูมตามที่เจ้าของจัดไว้
// รูปย่อตามขนาดที่แสดงจริง (คิดซูมด้วย): โลโก้เล็ก ≤ 76px = 240 · ใหญ่กว่า = 480/960
export function LogoBadge({ logo, size = 40, className = "" }: { logo: Logo; size?: number; className?: string }) {
  const px = size * Math.max(1, logo.zoom || 1);
  const w = px <= 120 ? 240 : px <= 240 ? 480 : 960;
  return (
    <span className={`${className.includes("absolute") ? "" : "relative "}inline-block shrink-0 rounded-full overflow-hidden bg-[#251d1b] ${className}`} style={{ width: size, height: size, border: "2px solid #e8c472", boxShadow: "0 2px 8px rgba(0,0,0,.45)" }}>
      <img src={sized(logo.src, w)} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: logo.pos, transform: `scale(${logo.zoom})`, transformOrigin: logo.pos }} />
    </span>
  );
}
