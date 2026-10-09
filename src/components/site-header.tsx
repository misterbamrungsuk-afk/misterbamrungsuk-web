/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

// ส่วนหัวแบรนด์ (แถบแยกด้านบน แบบหน้าแรก) — ใช้ร่วมทุกหน้าสาธารณะ
// right: ป้าย/ปุ่มด้านขวา (ค่าเริ่มต้น = ป้าย PREMIUM)
export function SiteHeader({ right, pill = "PREMIUM" }: { right?: React.ReactNode; pill?: string }) {
  return (
    <header className="relative z-30 flex justify-between items-center gap-3 px-4 py-3" style={{ background: "linear-gradient(180deg, #050303, #0e0a0a)" }}>
      <Link href="/" className="inline-flex items-center gap-2 font-lux font-semibold text-[20px] no-underline min-w-0">
        <img src="/brand/logo.png" alt="Mister Bamrungsuk" className="w-10 h-10 object-contain shrink-0" />
        <span className="text-[#e8c472] truncate">Mister Bamrungsuk</span>
      </Link>
      {right ?? <span className="shrink-0 px-3 py-[5px] rounded-full border border-[#f0c75a] text-[10px] tracking-[2.5px] text-[#ffd76a]">{pill}</span>}
    </header>
  );
}
