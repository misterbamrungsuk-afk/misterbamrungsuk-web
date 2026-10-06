import Link from "next/link";
import { Logo } from "@/components/ui";
import { PACKAGE_KEYS, type PartnerPackageKey } from "@/lib/partner/config";
import { verifyApplyToken } from "@/lib/partner/auth";
import { getPartner } from "@/lib/partner/store";
import { SignupPay } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "ชำระค่าแพ็กเกจพาร์ทเนอร์ · Mister Bamrungsuk" };

// ชำระค่าแพ็กเกจหลังส่งฟอร์มสมัคร (QR + สลิป เหมือน /join/pay) — ต้องมี token (?t=)
export default async function PartnerPay({ searchParams }: { searchParams: Promise<{ t?: string; pkg?: string }> }) {
  const { t, pkg } = await searchParams;
  const pid = verifyApplyToken(t);
  const p = pid ? await getPartner(pid).catch(() => null) : null;
  const initial = ([pkg, p?.package].find((x) => PACKAGE_KEYS.includes(x as PartnerPackageKey)) ?? "6m") as PartnerPackageKey;
  return (
    <div className="phone-stage"><main className="phone px-5 pb-12">
      <header className="flex items-center gap-3 h-16">
        <Link href="/partner" aria-label="ย้อนกลับ" className="w-10 h-10 rounded-full border border-ink-600 grid place-items-center text-xl">‹</Link>
        <Logo size={26} />
        <span className="ml-auto text-xs text-ink-300">ขั้นตอน 2/3</span>
      </header>
      <h1 className="font-display text-2xl font-semibold mt-2">ชำระค่าแพ็กเกจพาร์ทเนอร์</h1>
      {p ? <SignupPay token={t!} business={p.business_name} initial={initial} hasPassword={!!p.password_hash} />
        : <p className="mt-6 text-sm text-ink-300">ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาส่งฟอร์มสมัครที่ <Link href="/partner#apply" className="text-gold-300">/partner</Link> หรือติดต่อทีมงาน</p>}
    </main></div>
  );
}
