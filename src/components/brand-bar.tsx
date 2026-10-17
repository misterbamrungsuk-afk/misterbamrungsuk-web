import Link from "next/link";

// แถบโลโก้ด้านบน (เหมือนหน้าแรก) — โลโก้ + Mister Bamrungsuk → หน้าแรก · กระดิ่ง → การแจ้งเตือน (ยังไม่ล็อกอิน = พาไปล็อกอิน)
export function BrandBar({ className = "" }: { className?: string }) {
  return (
    <header className={`sticky top-0 z-30 ${className}`} style={{ background: "rgba(23,18,17,.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto w-full max-w-[1120px] flex items-center justify-between lg:px-8" style={{ padding: "10px 18px" }}>
        <Link href="/" aria-label="Mister Bamrungsuk · หน้าแรก" className="flex items-center gap-[10px] hover:text-inherit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="" width={38} height={38} className="w-[38px] h-[38px] object-contain" />
          <span className="font-brand text-[12px] md:text-[14px] text-[#e8c472] whitespace-nowrap">Mister Bamrungsuk</span>
        </Link>
        <Link href="/notifications" aria-label="การแจ้งเตือน" className="grid place-items-center w-11 h-11 rounded-full text-[#f3ead9] hover:text-[#f3ead9]" style={{ background: "rgba(232,196,114,0.16)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21h4" /></svg>
        </Link>
      </div>
    </header>
  );
}
