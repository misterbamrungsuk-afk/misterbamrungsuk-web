import Link from "next/link";
import { PACKAGE_KEYS, type PartnerPackageKey } from "@/lib/partner/config";
import { verifyApplyToken } from "@/lib/partner/auth";
import { getPartner } from "@/lib/partner/store";
import { SignupPay } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "ชำระค่าแพ็กเกจพาร์ทเนอร์ · Mister Bamrungsuk" };

// ชำระค่าแพ็กเกจหลังส่งฟอร์มสมัคร (QR + สลิป) — ต้องมี token (?t=) · ตามบอร์ด PartnerPay.dc.html
export default async function PartnerPay({ searchParams }: { searchParams: Promise<{ t?: string; pkg?: string }> }) {
  const { t, pkg } = await searchParams;
  const pid = verifyApplyToken(t);
  const p = pid ? await getPartner(pid).catch(() => null) : null;
  const initial = ([pkg, p?.package].find((x) => PACKAGE_KEYS.includes(x as PartnerPackageKey)) ?? "6m") as PartnerPackageKey;
  return (
    <main className="font-lux-body min-h-dvh bg-[#0e0a0a] text-[#f6efe4]">
      <div className="mx-auto w-full max-w-[480px] overflow-x-hidden pb-8">
        <div className="flex items-center gap-2 px-4 pt-4">
          <Link href="/partner" aria-label="ย้อนกลับ" className="grid h-11 w-11 place-items-center rounded-full border border-[rgba(240,200,90,.38)] bg-[#241717] text-[#ffd76a]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5-7 7 7 7" /></svg>
          </Link>
          <h1 className="font-lux m-0 text-[17px] font-semibold text-[#f0c75a]">ชำระแพ็กเกจพาร์ทเนอร์</h1>
        </div>
        <div className="flex min-w-0 flex-col gap-4 px-4 pt-4">
          {p ? <SignupPay token={t!} business={p.business_name} type={p.type} initial={initial} hasPassword={!!p.password_hash} />
            : <p className="m-0 text-[13px] text-[#cdbfb3]">ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาส่งฟอร์มสมัครที่ <Link href="/partner#apply" className="text-[#ffd76a]">หน้าพาร์ทเนอร์</Link> หรือติดต่อทีมงาน</p>}
        </div>
      </div>
    </main>
  );
}
