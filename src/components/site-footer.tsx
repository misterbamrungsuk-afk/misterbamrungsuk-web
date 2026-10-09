/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CONTROLLER } from "@/lib/join/legal";

// ขอบล่างของหน้าสาธารณะ (หน้าแรก / sale page) — ชื่อบริษัท + ลิงก์ข้อกำหนด / นโยบายความเป็นส่วนตัว (PDPA)
// ข้อมูลบริษัทมาจาก CONTROLLER ใน lib/join/legal.ts — ค่าที่ยังเป็น [placeholder] จะไม่แสดง
const filled = (v: string) => (v && !v.startsWith("[") ? v : "");

export function SiteFooter() {
  const name = filled(CONTROLLER.name);
  const address = filled(CONTROLLER.address);
  const email = filled(CONTROLLER.email);
  const phone = filled(CONTROLLER.phone);
  const links = [
    { href: "/join/terms", label: "ข้อกำหนดและเงื่อนไขการใช้งาน" },
    { href: "/join/privacy", label: "นโยบายความเป็นส่วนตัว (PDPA)" },
  ];
  return (
    <footer className="mx-4 mt-[18px] pt-4 pb-[22px] border-t border-[rgba(201,162,74,.45)] flex flex-col gap-3 text-[11.5px] text-[#d8c8b8]">
      <div className="flex justify-between items-center gap-3">
        <span className="inline-flex items-center gap-2">
          <img src="/brand/logo.png" alt="" className="w-[34px] h-[34px] object-contain" />
          <span className="font-lux font-semibold text-[21px] text-[#e8c472]">Bamrungsuk</span>
        </span>
        {email || phone ? <a href={email ? `mailto:${email}` : `tel:${phone}`} className="text-[#d8c8b8] hover:text-[#f6efe4]">ติดต่อเรา</a> : <span>ติดต่อเรา</span>}
      </div>
      <nav aria-label="เอกสารทางกฎหมาย" className="flex flex-wrap gap-x-3 gap-y-1">
        {links.map((l, i) => (
          <span key={l.href} className="inline-flex items-center gap-3">
            {i > 0 && <span aria-hidden className="text-[#7d6d6a]">|</span>}
            <Link href={l.href} className="text-[#d8c8b8] underline-offset-2 hover:underline hover:text-[#f6efe4]">{l.label}</Link>
          </span>
        ))}
      </nav>
      {(name || address || email || phone) && (
        <address className="not-italic leading-relaxed text-[#a8998c]">
          {name && <div className="text-[#d8c8b8]">{name}</div>}
          {address && <div>{address}</div>}
          {(email || phone) && <div>{[email, phone].filter(Boolean).join(" · ")}</div>}
        </address>
      )}
      <div className="text-[#7d6d6a]">© {new Date().getFullYear() + 543} Mister Bamrungsuk{name ? ` · ${name}` : ""} สงวนลิขสิทธิ์</div>
    </footer>
  );
}
