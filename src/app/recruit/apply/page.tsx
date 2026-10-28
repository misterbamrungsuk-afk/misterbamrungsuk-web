import { BrandBar } from "@/components/brand-bar";
import { SiteFooter } from "@/components/site-footer";
import { RecruitApplyForm } from "./form";

export const metadata = { title: "สมัคร Recruit · แนะนำ Part-time รับค่าตอบแทน — Mister Bamrungsuk" };

// สมัครเป็น Recruit (27 ต.ค. 2569) — กรอกข้อมูล + บัญชีรับค่าตอบแทน → ทีมงานอนุมัติแล้วส่ง ID/รหัสผ่านเข้าแดชบอร์ด
export default function RecruitApplyPage() {
  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9" }}>
      <BrandBar />
      <main className="mx-auto w-full max-w-[640px] flex flex-col gap-4" style={{ padding: "12px 18px 32px" }}>
        <section className="rounded-[22px] flex flex-col gap-2" style={{ padding: "20px 18px", background: "radial-gradient(80% 120% at 90% 0%, rgba(232,196,114,.22), rgba(0,0,0,0) 60%), linear-gradient(140deg, #3a0a14, #211a18 70%)", border: "1px solid rgba(232,196,114,.4)" }}>
          <span className="text-[12px] tracking-[.24em] font-semibold text-[#e8c472]">RECRUITER PROGRAM</span>
          <h1 className="m-0 text-[26px] md:text-[32px] leading-[1.3] font-bold">สมัครเป็น Recruit</h1>
          <p className="m-0 text-[15px] text-[#d9c9b4]">แนะนำ Part-time รับ <b className="text-[#e8c472]">฿500 / คน</b> เมื่อผู้สมัครได้งานแรก · โบนัสรายเดือน ผู้สมัครทำครบ 15 งาน รับ ฿1,000 · ครบ 20 งาน รับ ฿2,000</p>
        </section>
        {/* โปสเตอร์ Recruiter Program (บอสส่งมา 28 ต.ค. 2569) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-recruit-poster src="/brand/recruit-poster.webp" alt="Recruiter Program — แนะนำ Part-time รับ 500 บาทต่อคน เมื่อ Part-time รับงานครั้งแรก · โบนัสรายเดือน รับงานครบ 15 งาน 1,000 บาท · ครบ 20 งาน 2,000 บาท" width={1054} height={1492} className="w-full h-auto rounded-[22px]" style={{ boxShadow: "0 14px 32px rgba(0,0,0,.45)" }} />
        <RecruitApplyForm />
      </main>
      <SiteFooter />
    </div>
  );
}
