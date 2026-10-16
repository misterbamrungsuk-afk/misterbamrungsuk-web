/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

// ส่วนหัวแบรนด์ (แถบแยกด้านบน แบบหน้าแรก) — ใช้ร่วมทุกหน้าสาธารณะ
// right: ป้าย/ปุ่มด้านขวา (ค่าเริ่มต้น = ไม่มีป้าย)
export function SiteHeader({ right, pill = "" }: { right?: React.ReactNode; pill?: string }) {
  return (
    <header className="relative z-30 flex justify-between items-center gap-3 px-4 py-3" style={{ background: "#171211", borderBottom: "1px solid rgba(243,234,217,0.07)" }}>
      <Link href="/" className="inline-flex items-center gap-2 font-brand text-[13px] md:text-[15px] no-underline min-w-0" style={{ fontWeight: 400 }}>
        <img src="/brand/logo.png" alt="Mister Bamrungsuk" className="w-10 h-10 object-contain shrink-0" />
        <span className="text-[#e8c472] truncate">Mister Bamrungsuk</span>
      </Link>
      {right ?? (pill ? <span className="shrink-0 px-3 py-[5px] rounded-full border border-[#f0c75a] text-[10px] tracking-[2.5px] text-[#ffd76a]">{pill}</span> : null)}
    </header>
  );
}
