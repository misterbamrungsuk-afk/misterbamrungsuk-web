import Link from "next/link";
import { BrandBar } from "@/components/brand-bar";
import { SiteFooter } from "@/components/site-footer";
import { SalesLogin } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recruit · ชวนเปิดเมม รับค่าคอม — Mister Bamrungsuk" };

// หน้าขาย Recruit (/recruit · เดิม /sales) — อธิบายค่าตอบแทน + สมัครเอง /recruit/apply (ทีมงานอนุมัติแล้วออก ID) + เข้าแดชบอร์ด) · Part-Time ใช้หน้าในโปรไฟล์ของตัวเอง
export default async function SalesLanding({ searchParams }: { searchParams: Promise<{ expired?: string; out?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9" }}>
      <BrandBar />
      <main className="mx-auto w-full max-w-[880px] flex flex-col gap-4" style={{ padding: "12px 18px 0" }}>
        {sp.out && <p className="m-0 rounded-xl text-[14px] text-[#7fd6a3]" style={{ padding: 12, background: "rgba(60,170,110,.12)" }}>ออกจากระบบ Recruit แล้ว</p>}
        {sp.expired && <p className="m-0 rounded-xl text-[14px] text-[#ff8a9a]" style={{ padding: 12, background: "rgba(201,40,61,.12)" }}>กรุณาเข้าสู่ระบบด้วย ID และรหัสผ่านที่ทีมงานให้</p>}
        <section className="rounded-[22px] flex flex-col gap-2" style={{ padding: "20px 18px", background: "radial-gradient(80% 120% at 90% 0%, rgba(232,196,114,.22), rgba(0,0,0,0) 60%), linear-gradient(140deg, #3a0a14, #1c0d10 60%)", border: "1px solid rgba(232,196,114,.45)" }}>
          <span className="text-[12px] tracking-[.24em] font-semibold text-[#e8c472]">RECRUITER PROGRAM</span>
          <h1 className="m-0 text-[28px] md:text-[38px] leading-[1.3] font-bold">แนะนำ Part-time · ชวนลูกค้าเปิดเมม<br /><span className="text-[#e8c472]">รับค่าตอบแทนทุกคน</span></h1>
          <p className="m-0 text-[15px] text-[#d9c9b4]">ได้ลิงก์ของตัวเอง ผู้สมัคร Part-time/ลูกค้าเปิดเมมผ่านลิงก์คุณ ค่าตอบแทนเข้ากระเป๋าอัตโนมัติ · ดูผลงานได้ในหลังบ้านของตัวเอง</p>
        </section>
        {/* โปสเตอร์ Recruiter Program (บอสส่งมา 28 ต.ค. 2569) — แทนกล่องค่าตอบแทน/โบนัส */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-recruit-offer data-recruit-poster src="/brand/recruit-poster.webp" alt="Recruiter Program — แนะนำ Part-time รับ 500 บาทต่อคน เมื่อ Part-time รับงานครั้งแรก · โบนัสรายเดือน รับงานครบ 15 งาน 1,000 บาท · ครบ 20 งาน 2,000 บาท" width={1054} height={1492} className="w-full max-w-[560px] mx-auto h-auto rounded-[22px]" style={{ boxShadow: "0 14px 32px rgba(0,0,0,.45)" }} />
        <Link href="/recruit/apply" data-recruit-apply-cta className="min-h-14 rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[17px] grid place-items-center hover:text-[#1b130b]">สมัครเป็น Recruit</Link>
        <div className="rc-light"><SalesLogin /></div>
      </main>
      <SiteFooter />
    </div>
  );
}
