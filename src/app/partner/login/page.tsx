import Link from "next/link";
import { redirect } from "next/navigation";
import { getCovers } from "@/lib/covers";
import { lineAddUrl } from "@/lib/join/config";
import { currentPartner } from "@/lib/partner/auth";
import { timelineFor } from "@/lib/partner/identify";
import { Shell } from "../ui";
import { LogoutBtn, PartnerLoginForm } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "เข้าสู่ระบบพาร์ทเนอร์ · Mister Bamrungsuk" };

const DOT = { done: "#4cc283", next: "#f0c75a", fail: "#ef6b7b", todo: "#cdbfb3" } as const;
const WORD = { done: "ผ่าน", next: "กำลังดำเนินการ", fail: "ไม่ผ่าน", todo: "รอ" } as const;

// บอร์ด PartnerLogin — ฟอร์มล็อกอิน / บัญชีรออนุมัติ (account_status = pending)
export default async function PartnerLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const dest = next?.startsWith("/partner/portal") ? next : "/partner/portal";
  const p = await currentPartner();
  if (p && (p.account_status ?? "pending") !== "pending") redirect(dest);
  const hero = (await getCovers("partner_hero"))[0] ?? "/brand/spa.jpg";
  const steps = p ? await timelineFor(p) : [];
  return (
    <Shell>
      <div className="relative h-[300px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hero} alt="" className="w-full h-full object-cover block" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,10,10,.2),#0e0a0a)]" />
        <div className="absolute left-[18px] bottom-2.5">
          <div className="font-lux font-semibold text-[15px] inline-flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="Mister Bamrungsuk" className="w-10 h-10 object-contain" />
            <span className="text-[#f0c75a]">Partner</span>
          </div>
          <h1 className="font-lux font-semibold text-[26px] text-[#f0c75a] mt-0.5 mb-0">เข้าสู่ระบบพาร์ทเนอร์</h1>
        </div>
      </div>
      <div className="px-[18px] pt-2.5 flex flex-col gap-3.5">
        {!p ? (
          <PartnerLoginForm forgotHref={lineAddUrl()} />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-[#241717] border border-[rgba(212,175,55,.5)] p-3.5 flex gap-3 items-start">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f0c75a" strokeWidth="1.8" className="shrink-0" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              <div className="min-w-0">
                <div className="font-lux font-semibold text-base text-[#f0c75a]">บัญชีรอการอนุมัติ</div>
                <div className="text-[13px] text-[#cdbfb3] mt-1">
                  {p.business_name} ส่งใบสมัครเมื่อ {new Date(p.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" })} · ทีมงานตรวจภายใน 2 วันทำการ
                </div>
              </div>
            </div>
            <ul className="flex flex-col">
              {steps.map((c) => (
                <li key={c.n} className="flex gap-2.5 items-center text-[13px] min-h-8">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DOT[c.st] }} />
                  <span className="flex-1 min-w-0">{c.n}</span>
                  <span className="text-xs text-right" style={{ color: DOT[c.st] }}>{c.sub || WORD[c.st]}</span>
                </li>
              ))}
            </ul>
            <Link href="/partner/qc" className="btn-red-lux font-lux h-[52px] rounded-[14px] w-full text-[15px] grid place-items-center !text-white">นัด QC สถานที่</Link>
            <Link href={dest} className="text-[13px] text-center p-1">เข้าพอร์ทัลพาร์ทเนอร์ (ระหว่างรออนุมัติ)</Link>
            <LogoutBtn />
          </div>
        )}
      </div>
    </Shell>
  );
}
