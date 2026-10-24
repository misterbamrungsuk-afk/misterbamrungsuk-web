import Link from "next/link";
import { getMemberSettings } from "@/lib/member/tiers";
import { BrandBar } from "@/components/brand-bar";
import { SiteFooter } from "@/components/site-footer";
import { LINE_OA_ID } from "@/lib/join/config";
import { SalesLogin } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recruit · ชวนเปิดเมม รับค่าคอม — Mister Bamrungsuk" };
const baht = (n: number) => "฿" + n.toLocaleString("th-TH");

// หน้าขาย Recruit — อธิบายค่าคอม + วิธีสมัคร (ทีมงานสร้างบัญชีแล้วส่งลิงก์เข้าแดชบอร์ด) · Part-Time ใช้หน้าในโปรไฟล์ของตัวเอง
export default async function SalesLanding({ searchParams }: { searchParams: Promise<{ expired?: string; out?: string }> }) {
  const sp = await searchParams;
  const cfg = await getMemberSettings();
  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9" }}>
      <BrandBar />
      <main className="mx-auto w-full max-w-[880px] flex flex-col gap-4" style={{ padding: "12px 18px 0" }}>
        {sp.out && <p className="m-0 rounded-xl text-[14px] text-[#7fd6a3]" style={{ padding: 12, background: "rgba(60,170,110,.12)" }}>ออกจากระบบ Recruit แล้ว</p>}
        {sp.expired && <p className="m-0 rounded-xl text-[14px] text-[#ff8a9a]" style={{ padding: 12, background: "rgba(201,40,61,.12)" }}>กรุณาเข้าสู่ระบบด้วย ID และรหัสผ่านที่ทีมงานให้</p>}
        <section className="rounded-[22px] flex flex-col gap-2" style={{ padding: "20px 18px", background: "radial-gradient(80% 120% at 90% 0%, rgba(232,196,114,.22), rgba(0,0,0,0) 60%), linear-gradient(140deg, #3a0a14, #1c0d10 60%)", border: "1px solid rgba(232,196,114,.45)" }}>
          <span className="text-[12px] tracking-[.24em] font-semibold text-[#e8c472]">SALE MAN</span>
          <h1 className="m-0 text-[28px] md:text-[38px] leading-[1.3] font-bold">ชวนหมอสมัคร · ชวนลูกค้าเปิดเมม<br /><span className="text-[#e8c472]">รับค่าตอบแทนทุกคน</span></h1>
          <p className="m-0 text-[15px] text-[#d9c9b4]">ได้ลิงก์ของตัวเอง หมอสมัคร/ลูกค้าเปิดเมมผ่านลิงก์คุณ ค่าตอบแทนเข้ากระเป๋าอัตโนมัติ · ดูผลงานได้ในหลังบ้านของตัวเอง</p>
        </section>
        <SalesLogin />
        <section className="grid gap-3 md:grid-cols-2">
          {(["gold", "black"] as const).map((k) => (
            <div key={k} className="rounded-[18px]" style={{ padding: 16, background: k === "black" ? "linear-gradient(160deg, #241f1c, #120f0e)" : "linear-gradient(160deg, #4d1f2a, #2b1218)", border: "1.5px solid #e8c472" }}>
              <div className="text-[14px] text-[#d9c9b4]">ลูกค้าเปิดเมม {cfg.tiers[k].name} {baht(cfg.tiers[k].pay)}</div>
              <div className="text-[34px] font-bold text-[#e8c472] leading-tight">รับ {baht(cfg.tiers[k].commission)}</div>
              <div className="text-[13.5px] text-[#d9c9b4]">Part-Time เลือกเป็นวงเงินโปรโมทตัวเอง ×{cfg.boostMult} = {baht(cfg.tiers[k].commission * cfg.boostMult)}</div>
            </div>
          ))}
        </section>
        <section className="rounded-[18px] bg-[#211a18] flex flex-col gap-2" style={{ padding: 16 }}>
          <b className="text-[17px]">ขั้นตอน</b>
          <ol className="m-0 pl-5 text-[14.5px] leading-[1.8] text-[#d9c9b4]">
            <li>Part-Time: เปิดโปรไฟล์ของคุณ → "ชวนลูกค้าเปิดเมม รับค่าคอม" ได้โค้ดทันที</li>
            <li>คนทั่วไป: ติดต่อทีมงานทาง LINE <span className="text-[#f3ead9] select-all">{LINE_OA_ID}</span> ทีมงานสร้างบัญชีและออก ID / รหัสผ่านให้</li>
            <li>ส่งลิงก์ชวนหมอ → หมอสมัครและชำระค่าสมัคร → ค่าตอบแทนเข้ากระเป๋า</li>
            <li>ส่งลิงก์ให้ลูกค้า → ลูกค้าเปิดเมม → ค่าคอมเข้ากระเป๋า</li>
            <li>ขอรับค่าคอม → CEO อนุมัติ → ทีมงานโอนเข้าบัญชี</li>
          </ol>
          <div className="flex flex-wrap gap-2 mt-1">
            <Link href="/join/me" className="h-11 px-4 rounded-full grid place-items-center font-semibold bg-[#e8c472] text-[#1b130b] hover:text-[#1b130b]">ฉันเป็น Part-Time</Link>
            <Link href="/sales/me" className="h-11 px-4 rounded-full grid place-items-center font-semibold text-[#e8c472] hover:text-[#e8c472]" style={{ border: "1px solid #e8c472" }}>เข้าแดชบอร์ด Recruit</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
