/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CONTROLLER } from "@/lib/join/legal";
import { lineAddUrl } from "@/lib/join/config";

// ขอบล่างของหน้าสาธารณะ (หน้าแรก · Marketplace · พาร์ทเนอร์ · ร่วมงานกับเรา)
// จอคอม = 4 คอลัมน์ (แบรนด์+ติดต่อ · สำหรับลูกค้า · ร่วมงานกับเรา · ช่วยเหลือและนโยบาย) · มือถือ = เรียงลงมา 2 คอลัมน์
// ข้อมูลบริษัทมาจาก CONTROLLER ใน lib/join/legal.ts — ค่าที่ยังเป็น [placeholder] จะไม่แสดง
const filled = (v: string) => (v && !v.startsWith("[") ? v : "");

const COLS: { title: string; links: [string, string][] }[] = [
  { title: "สำหรับลูกค้า", links: [["/", "ค้นหาเพื่อนกินเที่ยว"], ["/map", "แผนที่"], ["/quick", "เรียกด่วน"], ["/market", "โรงแรม · สปา"], ["/products", "สินค้า"], ["/orders/track", "ติดตามคำสั่งซื้อ"]] },
  { title: "ร่วมงานกับเรา", links: [["/join", "สมัคร Part-Time"], ["/join/earnings", "รายได้ Part-Time"], ["/join/showcase", "หน้าตัวอย่างแอป"], ["/join/me", "เข้าโปรไฟล์ Part-Time"], ["/partner", "พาร์ทเนอร์สปา · โรงแรม"], ["/vendor", "เปิดร้านค้ากับเรา"]] },
  { title: "ช่วยเหลือและนโยบาย", links: [["/page/terms", "ข้อกำหนดการใช้งาน"], ["/join/privacy", "นโยบายความเป็นส่วนตัว (PDPA)"], ["/policy", "กฎเกณฑ์และความปลอดภัย"], ["/sos", "SOS ฉุกเฉิน"]] },
];

export function SiteFooter() {
  const reg = filled(CONTROLLER.regNo);
  const address = filled(CONTROLLER.address);
  const email = filled(CONTROLLER.email);
  const phone = filled(CONTROLLER.phone);
  const link = "text-[#d8c8b8] hover:text-[#f6efe4] min-h-9 inline-flex items-center";
  return (
    <footer className="mt-10 border-t border-[rgba(201,162,74,.35)]" style={{ background: "linear-gradient(180deg, rgba(43,22,28,.55), rgba(23,18,17,0))" }}>
      <div className="mx-auto w-full max-w-[1200px] px-[18px] md:px-8 pt-8 pb-6 grid gap-8 grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] text-[13.5px]">
        <div className="col-span-2 md:col-span-1 flex flex-col gap-3 min-w-0">
          <span className="inline-flex items-center gap-2.5">
            <img src="/brand/logo.png" alt="" className="w-[42px] h-[42px] object-contain" />
            <span className="font-brand text-[16px] text-[#e8c472]">Mister Bamrungsuk</span>
          </span>
          <p className="m-0 text-[#bfae9f] leading-[1.7] max-w-[340px]">เพื่อนกินเที่ยวพรีเมียม ผ่านการอบรมและยืนยันตัวตน · ชำระเงินผ่านระบบ เงินพักไว้กับเราจนจบนัด</p>
          <div className="flex flex-col gap-0.5 text-[#d8c8b8]">
            {phone && <span>โทร {phone}</span>}
            {email && <span className="break-all">{email}</span>}
          </div>
          <a href={lineAddUrl()} target="_blank" rel="noopener noreferrer" className="self-start h-10 px-4 rounded-full inline-flex items-center gap-2 font-semibold text-[#1b130b] bg-[#06c755] hover:text-[#1b130b]">ติดต่อทีมงานทาง LINE</a>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title} className="flex flex-col min-w-0">
            <b className="text-[#e8c472] font-semibold mb-1.5">{c.title}</b>
            {c.links.map(([h, l]) => <Link key={h} href={h} className={link}>{l}</Link>)}
          </nav>
        ))}
      </div>
      <div className="mx-auto w-full max-w-[1200px] px-[18px] md:px-8 py-4 border-t border-[rgba(243,234,217,.08)] flex flex-col md:flex-row md:justify-between gap-1 text-[12px] text-[#9a8a85]">
        <span>© {new Date().getFullYear() + 543} Mister Bamrungsuk สงวนลิขสิทธิ์{reg ? ` · ทะเบียนนิติบุคคลเลขที่ ${reg}` : ""}</span>
        {address && <span className="md:text-right">{address}</span>}
      </div>
    </footer>
  );
}
