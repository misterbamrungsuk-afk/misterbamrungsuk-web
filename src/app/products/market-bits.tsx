import Link from "next/link";
import { DISCREET, TRUST_POINTS } from "@/lib/market/config";

// ชิ้นส่วน UI ฝั่งเซิร์ฟเวอร์ของ Marketplace (ใช้ได้ทั้ง server/client component)

export function TrustBar({ className = "" }: { className?: string }) {
  return (
    <div className={`border-y border-gold-500/20 bg-ink-800/60 ${className}`}>
      <ul className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-ink-200">
        {TRUST_POINTS.map((t) => (
          <li key={t} className="inline-flex items-center gap-2"><span className="w-5 h-5 rounded-full border border-gold-500/70 text-gold-300 grid place-items-center text-[11px]">✓</span>{t}</li>
        ))}
      </ul>
    </div>
  );
}

export function DiscreetPromise({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-gold-500/60 bg-gold-500/5 px-4 py-3 flex items-center gap-3 ${className}`}>
      <span className="w-9 h-9 shrink-0 rounded-xl bg-gold-500/15 text-gold-300 grid place-items-center text-lg" aria-hidden>▣</span>
      <div>
        <p className="font-semibold text-gold-300">{DISCREET}</p>
        <p className="text-xs text-ink-300">กล่องเรียบ ไม่มีโลโก้สินค้า ใบปะหน้าระบุเพียงชื่อผู้รับและผู้ส่ง</p>
      </div>
    </div>
  );
}

export function Stars({ n, className = "" }: { n: number; className?: string }) {
  const r = Math.round(n);
  return <span className={`text-gold-400 tracking-tight ${className}`} aria-label={`${n.toFixed(1)} ดาว`}>{"★".repeat(r)}<span className="text-ink-600">{"★".repeat(5 - r)}</span></span>;
}

export function MarketFooter() {
  const link = "hover:text-gold-300";
  return (
    <footer className="border-t border-ink-600 mt-8">
      <div className="max-w-6xl mx-auto px-4 py-8 grid gap-6 sm:grid-cols-3 text-sm">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-gold-500">MISTER BAMRUNGSUK</p>
          <p className="text-[#9a8a85] text-xs mt-2 leading-relaxed">สินค้าบางรายการจำหน่ายเฉพาะผู้มีอายุ 20 ปีขึ้นไป · ผลิตภัณฑ์ไม่ใช่ยา ไม่มีผลในการป้องกันหรือรักษาโรค</p>
        </div>
        <nav className="flex flex-col gap-1.5 text-ink-300">
          <Link className={link} href="/products">สินค้าทั้งหมด</Link>
          <Link className={link} href="/orders/track">ติดตามคำสั่งซื้อ</Link>
          <Link className={link} href="/vendor">สำหรับร้านค้า</Link>
        </nav>
        <nav className="flex flex-col gap-1.5 text-ink-300">
          <Link className={link} href="/policy/returns">นโยบายคืนสินค้า</Link>
          <Link className={link} href="/policy/shipping">นโยบายการจัดส่ง</Link>
          <Link className={link} href="/policy/privacy-shop">นโยบายความเป็นส่วนตัว</Link>
        </nav>
      </div>
      <p className="text-center text-xs text-[#9a8a85] pb-6">© Mister Bamrungsuk</p>
    </footer>
  );
}

export function SectionHead({ eyebrow, title, sub, right }: { eyebrow: string; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end gap-3 mb-5">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-gold-500">{eyebrow}</p>
        <h2 className="section-title text-2xl font-semibold mt-1">{title}</h2>
        {sub && <p className="text-ink-300 text-sm mt-1">{sub}</p>}
      </div>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}
