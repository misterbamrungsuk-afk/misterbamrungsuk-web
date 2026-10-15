import Link from "next/link";
import { BrandHeader, Container, Shell } from "@/components/mb/ui";

export const metadata = { title: "Mister Bamrungsuk — ร่วมงานกับเรา" };

const ICON = {
  team: "M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM16.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M13.5 14.3c.9-.2 1.9-.3 3-.3 3 0 5.5 2.4 5.5 5.5",
  spa: "M12 3c2.5 3 2.5 6 0 9-2.5-3-2.5-6 0-9zM12 12c-3-2.5-6.5-2.5-9 0 2.5 3 6 3 9 0zM12 12c3-2.5 6.5-2.5 9 0-2.5 3-6 3-9 0zM12 12v9M8 21h8",
  shop: "M5 8h14l-1.2 12H6.2L5 8zM9 8V6a3 3 0 0 1 6 0v2M9.5 12.5h5",
};

const PATHS = [
  { href: "/join", tag: "Part Time", title: "เพื่อนกินเที่ยว", sub: "งานพาร์ทไทม์ เลือกวันเวลาเอง", go: "สมัครพาร์ทไทม์", bg: "#251d1b", icon: ICON.team },
  { href: "/partner", tag: "Partner", title: "สปาและโรงแรม", sub: "รับลูกค้าพรีเมียมผ่านแพลตฟอร์ม", go: "สมัครพาร์ทเนอร์", bg: "#2c1a1f", icon: ICON.spa },
  { href: "/market", tag: "Marketplace", title: "เปิดร้านค้ากับเรา", sub: "วางขายสินค้าถึงลูกค้าพรีเมียม", go: "เริ่มขายสินค้า", bg: "#272013", icon: ICON.shop },
];

// หน้าแรก (ตามบอร์ด Main): "ร่วมงานกับเรา" 3 ทาง · มือถือเรียงลง / lg วาง 3 คอลัมน์
export default function MainPage() {
  return (
    <Shell header={<BrandHeader right={<Link href="/login" className="min-h-10 px-3.5 rounded-full inline-flex items-center bg-mb-surface2 text-mb-text text-[13px] font-light hover:text-mb-text">เข้าสู่ระบบ</Link>} />}>
      <Container className="pt-8 md:pt-14 flex flex-col gap-4 md:gap-6">
        <h1 className="mb-h text-[30px] md:text-[40px] leading-tight tracking-[-.01em] mb-1">ร่วมงานกับเรา</h1>
        <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
          {PATHS.map((p) => (
            <Link key={p.href} href={p.href} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-[22px] md:p-7 rounded-2xl text-mb-text hover:text-mb-text transition hover:brightness-110" style={{ background: p.bg }}>
              <span className="min-w-0">
                <span className="block text-[12px] tracking-[.24em] uppercase text-mb-gold font-semibold">{p.tag}</span>
                <span className="mb-h block text-[18px] md:text-[20px] mt-1">{p.title}</span>
                <span className="block text-[14px] text-[#bfae9f] mt-1">{p.sub}</span>
                <span className="mt-4 inline-flex items-center min-h-11 px-5 rounded-full bg-mb-gold text-mb-ink text-[14px] font-semibold">{p.go} ›</span>
              </span>
              <span aria-hidden className="w-[72px] h-[72px] rounded-full grid place-items-center text-mb-gold bg-[rgba(232,196,114,.06)] transition group-hover:scale-105">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={p.icon} /></svg>
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </Shell>
  );
}
