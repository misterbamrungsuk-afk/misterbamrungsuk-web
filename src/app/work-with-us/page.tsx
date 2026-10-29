/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CONTROLLER } from "@/lib/join/legal";
import { getSite } from "@/i18n/server";
import { LangSwitch } from "@/i18n/provider";

export async function generateMetadata() { return { title: (await getSite()).work.metaTitle }; }

// บอร์ด Main "ร่วมงานกับเรา · เลือกรูปแบบ" — มือถือตามบอร์ด · lg การ์ด 3 คอลัมน์
const PATHS = [
  { href: "/join", tag: "Part Time", title: "เพื่อนกินเที่ยว", sub: "งานพาร์ทไทม์ เลือกวันเวลาเอง", go: "สมัครพาร์ทไทม์ ›", bg: "#251d1b",
    d: "M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM16.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M13.5 14.3c.9-.2 1.9-.3 3-.3 3 0 5.5 2.4 5.5 5.5" },
  { href: "/partner", tag: "Partner", title: "สปาและโรงแรม", sub: "รับลูกค้าพรีเมียมผ่านแพลตฟอร์ม", go: "สมัครพาร์ทเนอร์ ›", bg: "#2c1a1f",
    d: "M12 3c2.5 3 2.5 6 0 9-2.5-3-2.5-6 0-9zM12 12c-3-2.5-6.5-2.5-9 0 2.5 3 6 3 9 0zM12 12c3-2.5 6.5-2.5 9 0-2.5 3-6 3-9 0zM12 12v9M8 21h8" },
  { href: "/market", tag: "Marketplace", title: "เปิดร้านค้ากับเรา", sub: "วางขายสินค้าถึงลูกค้าพรีเมียม", go: "เริ่มขายสินค้า ›", bg: "#272013",
    d: "M5 8h14l-1.2 12H6.2L5 8zM9 8V6a3 3 0 0 1 6 0v2M9.5 12.5h5" },
];

export default async function WorkWithUsPage() {
  const W = (await getSite()).work;
  return (
    <div className="mb-v7 min-h-dvh flex flex-col" style={{ background: "#171211", color: "#f3ead9", fontSize: 15, lineHeight: 1.65 }}>
      <header className="border-b border-[rgba(243,234,217,0.07)]">
        <div className="mx-auto max-w-[1200px] flex items-center justify-between" style={{ padding: "12px 16px" }}>
          <Link href="/" className="inline-flex items-center gap-2"><img src="/brand/logo.png" alt="Mister Bamrungsuk" width={38} height={38} className="w-[38px] h-[38px] object-contain" /><span className="font-brand text-[11px] md:text-[14px] text-[#e8c472]">Mister Bamrungsuk</span></Link>
          <span className="flex items-center gap-2"><LangSwitch /><Link href="/login" className="min-h-10 px-[14px] rounded-full text-[#f3ead9] text-[13px] inline-flex items-center bg-[#251d1b] font-light hover:text-[#f3ead9]">{(await getSite()).common.login}</Link></span>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1200px] flex flex-col gap-4 lg:flex-1 lg:justify-center lg:gap-8" style={{ padding: "32px 16px 0" }}>
        <div className="mb-1"><h1 className="m-0 font-semibold text-[30px] md:text-[38px] lg:text-[44px] leading-[1.25] tracking-[-.01em]">{W.title}</h1></div>
        <div className="grid gap-4 lg:grid-cols-3">
          {PATHS.map((p0, i) => { const p = { ...p0, ...W.paths[i] }; return (
            <Link key={p.href} href={p.href} className="relative overflow-hidden grid items-center gap-3 rounded-2xl text-[#f3ead9] hover:text-[#f3ead9] lg:flex lg:flex-col-reverse lg:items-start lg:justify-end lg:gap-6 lg:min-h-[300px] lg:!p-8 lg:rounded-3xl transition-transform lg:hover:-translate-y-1" style={{ gridTemplateColumns: "minmax(0,1fr) auto", padding: "22px 20px", background: p.bg }}>
              <span className="min-w-0">
                <span className="text-[12px] tracking-[.24em] text-[#e8c472] uppercase font-semibold">{p.tag}</span>
                <span className="block font-semibold text-[18px] lg:text-[24px] leading-[1.35] mt-1">{p.title}</span>
                <span className="block text-[14px] lg:text-[16px] text-[#bfae9f] mt-1">{p.sub}</span>
                <span className="mt-4 lg:mt-6 inline-flex items-center min-h-[42px] px-5 rounded-full bg-[#e8c472] text-[#1b130b] text-[14px] font-semibold">{p.go}</span>
              </span>
              <span aria-hidden="true" className="w-[72px] h-[72px] lg:w-[84px] lg:h-[84px] rounded-full grid place-items-center text-[#e8c472]" style={{ background: "rgba(232,196,114,.06)" }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={p.d} /></svg>
              </span>
            </Link>
          ); })}
        </div>
        <Link href="/join/me" className="self-start tap text-[14px] text-[#e8c472] hover:text-[#e8c472]">{W.ptLogin}</Link>
      </section>

      <footer className="mx-auto w-full max-w-[1200px]" style={{ padding: "0 16px" }}>
        <div className="flex flex-col border-t border-[rgba(243,234,217,0.07)] text-[#b5a596]" style={{ marginTop: 32, padding: "18px 0 24px", gap: 13, fontSize: 13.5, lineHeight: 1.6 }}>
          <div className="flex justify-between items-center gap-3">
            <span className="inline-flex items-center gap-2"><img src="/brand/logo.png" alt="" width={30} height={30} className="w-[30px] h-[30px] object-contain" /><span className="font-brand text-[19px] text-[#e8c472]">Bamrungsuk</span></span>
            <span className="text-[#f3ead9] font-semibold">{W.contact}</span>
          </div>
          <div className="flex flex-wrap text-[#f3ead9]" style={{ gap: "4px 12px" }}><Link href="/join/terms" className="tap text-[#f3ead9] hover:underline">{W.terms}</Link><span className="text-[#b5a596]">|</span><Link href="/join/privacy" className="tap text-[#f3ead9] hover:underline">{W.privacy}</Link></div>
          <div className="select-all">{`${CONTROLLER.email} · ${CONTROLLER.phone}`}</div>
          <div>© {(await getSite()).footer.buddhist ? 2569 : 2026} Mister Bamrungsuk {(await getSite()).footer.rights}</div>
        </div>
      </footer>
    </div>
  );
}
