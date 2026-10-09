/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { HomeSlider } from "./home-slider";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Mister Bamrungsuk — เลือกเส้นทางของคุณ" };

const PATHS = [
  {
    href: "/join", eyebrow: "PART-TIME", title: "สมัครร่วมทีม", desc: "ดูรายละเอียดและขั้นตอนการสมัคร", cta: "ดูรายละเอียด →", bg: "linear-gradient(135deg, #3a0d15, #200a0d)",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e8c472" strokeWidth="1.4" strokeLinecap="round"><circle cx="12" cy="8" r="3" /><circle cx="5.5" cy="9.5" r="2.2" /><circle cx="18.5" cy="9.5" r="2.2" /><path d="M6.5 19c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5M2 18c0-2.2 1.6-4 3.5-4M22 18c0-2.2-1.6-4-3.5-4" /></svg>,
  },
  {
    href: "/partner", eyebrow: "PARTNER", title: "พาร์ทเนอร์สปาและโรงแรม", desc: "ร่วมเป็นส่วนหนึ่งของเครือข่ายบริการ", cta: "ร่วมเป็นพาร์ทเนอร์ →", bg: "linear-gradient(135deg, #1e1b16, #121010)",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e8c472" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8l4-2 4 2M22 8l-4-2-5 2.5-3 3a1.4 1.4 0 0 0 2 2l2.5-2 5 4.5" /><path d="M2 8v7l7 5 2-1M22 8v7l-3 2" /><path d="M8 15l2 1.5M10 13.5l2.5 2" /></svg>,
  },
  {
    href: "/products", eyebrow: "MARKETPLACE", title: "โรงแรม • สปา • สินค้า", desc: "ค้นหาบริการและสินค้าที่คุณสนใจ", cta: "สำรวจ Marketplace →", bg: "linear-gradient(135deg, #3a0d15, #200a0d)",
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e8c472" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7h14l-1 14H6L5 7z" /><path d="M9 10V6a3 3 0 0 1 6 0v4" /></svg>,
  },
];

// หน้าแรก (ตามบอร์ด Main): เลือกเส้นทาง — สมัครร่วมทีม / พาร์ทเนอร์ / Marketplace + กล่องลูกค้า
// (Marketplace home เดิมย้ายไป /market)
export default function MainPage() {
  return (
    <main className="min-h-dvh bg-[#0e0a0a]">
      <div className="font-lux-body mx-auto w-full max-w-[480px] min-h-dvh flex flex-col overflow-hidden text-[#f6efe4] font-semibold" style={{ background: "linear-gradient(180deg, #0e0a0a 40%, #3a0d15 100%)" }}>
        <header className="flex justify-between items-center px-4 py-3" style={{ background: "linear-gradient(180deg, #050303, #0e0a0a)" }}>
          <span className="inline-flex items-center gap-2 font-lux font-semibold text-[20px]">
            <img src="/brand/logo.png" alt="Mister Bamrungsuk" className="w-10 h-10 object-contain" />
            <span className="text-[#e8c472]">Mister Bamrungsuk</span>
          </span>
          <span className="px-3 py-[5px] rounded-full border border-[#f0c75a] text-[10px] tracking-[2.5px] text-[#ffd76a]">PREMIUM</span>
        </header>

        <HomeSlider />

        <div className="px-4 pt-[26px] pb-2 flex flex-col gap-4">
          <div className="text-center">
            <div className="flex items-center gap-3.5 justify-center">
              <span className="flex-1 h-px bg-[linear-gradient(90deg,transparent,#c9a24a)]" />
              <h1 className="font-lux font-semibold text-[25px] text-[#f6efe4]">เลือกเส้นทางของคุณ</h1>
              <span className="flex-1 h-px bg-[linear-gradient(90deg,#c9a24a,transparent)]" />
            </div>
            <p className="mt-1 text-[13.5px] text-[#d8c09a]">ร่วมงาน ร่วมธุรกิจ หรือค้นหาบริการ</p>
          </div>

          {PATHS.map((p) => (
            <Link key={p.href} href={p.href} className="no-underline text-[#f6efe4] hover:text-[#f6efe4] lux-card px-4 py-[18px] rounded-2xl border border-[#c9a24a] flex items-center gap-3.5" style={{ background: p.bg }}>
              <span className="lux-icon shrink-0 w-14 h-14 rounded-full border border-[#c9a24a] grid place-items-center">{p.icon}</span>
              <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="font-lux font-semibold text-[12px] tracking-[2px] text-[#d8b260]">{p.eyebrow}</span>
                <span className="font-lux font-semibold text-[21px] leading-[1.25]">{p.title}</span>
                <span className="text-[12px] leading-[1.5] text-[#d8c8b8]">{p.desc}</span>
                <span className="lux-cta self-start mt-2 px-3 py-1.5 rounded-lg border border-[#c9a24a] text-[12px] text-[#f6efe4]">{p.cta}</span>
              </span>
            </Link>
          ))}
        </div>

        <section className="lux-card group mx-4 mt-[18px] rounded-[14px] border border-[#c9a24a] overflow-hidden flex min-h-[190px]" style={{ background: "linear-gradient(135deg, #2e0c12, #1e080b)" }}>
          <div className="font-lux flex-[1.15] min-w-0 py-4 pr-3 pl-3.5 flex flex-col gap-[5px] justify-center font-semibold">
            <div className="flex items-center gap-2 text-[11px] text-[#d8b260]">สำหรับลูกค้า<span className="flex-1 max-w-[50px] h-px bg-[#c9a24a]" /></div>
            <h2 className="text-[21px] leading-[1.2] text-[#fff6e3] font-semibold">ต้องการใช้บริการ?</h2>
            <p className="text-[11.5px] text-[#e6d9cd]">สมัครสมาชิกเพื่อเริ่มต้นการจอง</p>
            <Link href="/auth/register" className="btn-gold-lux mt-2 py-2.5 px-1.5 rounded-lg no-underline text-center text-[13.5px] hover:text-[#2a1c0c]">สมัครใช้บริการ →</Link>
            <p className="mt-1 text-[11px] text-[#e6d9cd]">
              <Link href="/login" className="underline text-[#e6d9cd] hover:text-[#f6efe4]">มีบัญชีแล้ว?</Link>{" "}
              <Link href="/login" className="underline text-[#e6d9cd] hover:text-[#f6efe4]">เข้าสู่ระบบ</Link>
            </p>
          </div>
          <img src="/brand/spa.jpg" alt="บรรยากาศสปาพาร์ทเนอร์" className="flex-1 min-w-0 w-0 object-cover block transition-transform duration-500 group-hover:scale-105" />
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
