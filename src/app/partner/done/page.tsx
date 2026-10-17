import Link from "next/link";
import { PARTNER_PACKAGES } from "@/lib/partner/config";
import { lineAddUrl } from "@/lib/join/config";
import { partnerFromTokenOrSession, timelineFor } from "@/lib/partner/identify";
import { partnerCode } from "@/lib/partner/status";
import { CTA, CARD, CheckIcon, Shell, Timeline } from "../ui";
import { CopyCode, LineButton } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "พาร์ทเนอร์สมัครสำเร็จ · Mister Bamrungsuk" };

// หลังส่งใบสมัคร + สลิป (บอร์ด PartnerDone) — ระบุตัวด้วย ?t= (token ฟอร์มสมัคร) หรือเซสชันพาร์ทเนอร์
export default async function PartnerDone({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const p = await partnerFromTokenOrSession(t);
  if (!p)
    return (
      <Shell>
        <div className="px-4 pt-10 text-center text-sm text-[#cdbfb3]">
          ลิงก์หมดอายุหรือไม่ถูกต้อง — <Link href="/partner/login">เข้าสู่ระบบพาร์ทเนอร์</Link> หรือ <Link href="/partner#apply">สมัครพาร์ทเนอร์</Link>
        </div>
      </Shell>
    );
  const steps = await timelineFor(p);
  const code = partnerCode(p.id, p.created_at);
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  const pay = steps[1];
  return (
    <Shell>
      <div className="px-4 pt-6 flex flex-col gap-3.5">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full border-2 border-[#f0c75a] grid place-items-center text-[#ffd76a]"><CheckIcon /></div>
          <div className="text-[11px] tracking-[2.5px] text-[#f0c75a] mt-2.5">ยินดีต้อนรับพาร์ทเนอร์ใหม่</div>
          <h1 className="font-lux font-semibold text-2xl text-[#f0c75a] mt-1">ส่งใบสมัครและสลิปแล้ว</h1>
          <p className="text-[13px] text-[#cdbfb3] mt-1">{p.business_name}{pay.sub === "รอตรวจสลิป" ? " · ทีมงานตรวจสลิปภายใน 24 ชม." : ""}</p>
        </div>
        <div className="rounded-[22px] p-[18px] border border-[rgba(212,175,55,.55)] bg-[linear-gradient(150deg,#3a2614,#241717_55%,#2a0f15)] flex flex-col gap-2">
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs text-[#ffd76a]">รหัสพาร์ทเนอร์ของคุณ</span>
            <span className="text-[11px] px-2.5 py-[3px] rounded-full border border-[#f0c75a] text-[#f0c75a]">แผนโปรโมท {PARTNER_PACKAGES[p.package]?.label ?? p.package}</span>
          </div>
          <div className="font-lux font-semibold text-[32px] tracking-[3px]">{code}</div>
          <CopyCode code={code} />
        </div>
        <div className={CARD}>
          <div className="font-lux font-semibold text-[15px] text-[#f0c75a] mb-2">สถานะการสมัคร</div>
          <Timeline steps={steps} />
        </div>
        <LineButton href={lineAddUrl()} />
        <Link href={`/partner/qc${q}`} className={`${CTA} !text-white no-underline`}>นัด QC สถานที่</Link>
        {/* ยังไม่ตั้งรหัสผ่าน = ไปตั้งรหัสด้วย token เดิม (กันทางตัน) · ตั้งแล้ว = เข้าสู่ระบบ */}
        {!p.password_hash && t
          ? <Link href={`/partner/register${q}`} className="min-h-12 rounded-[14px] border border-[rgba(240,200,90,.38)] bg-[#241717] grid place-items-center text-sm font-semibold no-underline">ตั้งรหัสผ่าน / เข้าสู่ระบบพอร์ทัล</Link>
          : <Link href="/partner/login" className="min-h-11 grid place-items-center text-[13px] text-center p-1">เข้าสู่ระบบพอร์ทัลพาร์ทเนอร์</Link>}
      </div>
    </Shell>
  );
}
