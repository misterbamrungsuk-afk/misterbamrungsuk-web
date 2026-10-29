"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { CONTROLLER } from "@/lib/join/legal";
import { LINE_OA_ID } from "@/lib/join/config";

// ขอบล่างของหน้าสาธารณะ (หน้าแรก · Marketplace · พาร์ทเนอร์ · ร่วมงานกับเรา)
// จอคอม = 4 คอลัมน์ (แบรนด์+ติดต่อ · สำหรับลูกค้า · ร่วมงานกับเรา · ช่วยเหลือและนโยบาย) · มือถือ = แบบย่อ (ติดต่อ 1 บรรทัด + ลิงก์สำคัญ 1 แถว)
// ข้อมูลบริษัทมาจาก CONTROLLER ใน lib/join/legal.ts — ค่าที่ยังเป็น [placeholder] จะไม่แสดง
const filled = (v: string) => (v && !v.startsWith("[") ? v : "");
// ปี พ.ศ. ตามเวลาไทย (เซิร์ฟเวอร์อยู่ต่างโซนเวลา — ใช้เวลาเครื่องตรง ๆ ช่วงข้ามปีจะได้ปีไม่ตรงกับเบราว์เซอร์ = hydration mismatch)
const yearBE = () => Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric" }).format(new Date())) + 543;


// ข้อความ/ลิงก์ 3 ภาษา: src/i18n/site.ts (footer) · ปี: ไทย = พ.ศ. · EN/中文 = ค.ศ.
export function SiteFooter() {
  const { s: S } = useI18n();
  const F = S.footer;
  const year = F.buddhist ? yearBE() : yearBE() - 543;
  const reg = filled(CONTROLLER.regNo);
  const address = filled(CONTROLLER.address);
  const email = filled(CONTROLLER.email);
  const phone = filled(CONTROLLER.phone);
  const link = "text-[#d8c8b8] hover:text-[#f6efe4] min-h-9 inline-flex items-center";
  return (
    <footer className="mt-8 md:mt-10 border-t border-[rgba(201,162,74,.35)]" style={{ background: "linear-gradient(180deg, rgba(43,22,28,.55), rgba(23,18,17,0))" }}>
      {/* มือถือ: แบบย่อ */}
      <div className="md:hidden px-[18px] pt-5 pb-4 flex flex-col gap-2.5 text-[13px] text-[#d8c8b8]">
        <span className="inline-flex items-center gap-2"><img src="/brand/logo.png" alt="" className="w-8 h-8 object-contain" /><span className="font-brand text-[14px] text-[#e8c472]">Mister Bamrungsuk</span></span>
        <span>{phone && <>{F.tel} {phone} · </>}LINE <span className="select-all">{LINE_OA_ID}</span></span>
        <nav aria-label={F.keyLinks} className="flex flex-wrap gap-x-4">
          {F.short.map(([h, l]) => <Link key={h} href={h} className="min-h-9 inline-flex items-center text-[#d8c8b8] hover:text-[#f6efe4]">{l}</Link>)}
        </nav>
        <span className="text-[11.5px] text-[#9a8a85]">© {year} Mister Bamrungsuk {F.rights}</span>
      </div>
      <div className="hidden md:grid mx-auto w-full max-w-[1200px] px-8 pt-8 pb-6 gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr] text-[13.5px]">
        <div className="flex flex-col gap-3 min-w-0">
          <span className="inline-flex items-center gap-2.5">
            <img src="/brand/logo.png" alt="" className="w-[42px] h-[42px] object-contain" />
            <span className="font-brand text-[16px] text-[#e8c472]">Mister Bamrungsuk</span>
          </span>
          <p className="m-0 text-[#bfae9f] leading-[1.7] max-w-[340px]">{F.about}</p>
          <div className="flex flex-col gap-0.5 text-[#d8c8b8]">
            {phone && <span>{F.tel} {phone}</span>}
            {email && <span className="break-all">{email}</span>}
          </div>
          <span className="text-[#d8c8b8]">LINE <span className="select-all">{LINE_OA_ID}</span></span>
        </div>
        {F.cols.map((c) => (
          <nav key={c.title} aria-label={c.title} className="flex flex-col min-w-0">
            <b className="text-[#e8c472] font-semibold mb-1.5">{c.title}</b>
            {c.links.map(([h, l]) => <Link key={h} href={h} className={link}>{l}</Link>)}
          </nav>
        ))}
      </div>
      <div className="hidden md:flex mx-auto w-full max-w-[1200px] px-8 py-4 border-t border-[rgba(243,234,217,.08)] flex-row justify-between gap-1 text-[12px] text-[#9a8a85]">
        <span>© {year} Mister Bamrungsuk {F.rights}{reg ? ` · ${F.reg(reg)}` : ""}</span>
        {address && <span className="md:text-right">{address}</span>}
      </div>
    </footer>
  );
}
