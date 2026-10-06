import Link from "next/link";
import { Logo } from "@/components/ui";
import { verifyApplyToken } from "@/lib/partner/auth";
import { getPartner } from "@/lib/partner/store";
import { SetPasswordForm } from "../auth-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "สร้างบัญชีพาร์ทเนอร์ · Mister Bamrungsuk" };

// ตั้งรหัสผ่านหลังส่งฟอร์มสมัคร — ต้องมาจากลิงก์ที่มี token (?t=)
export default async function PartnerRegister({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const pid = verifyApplyToken(t);
  const p = pid ? await getPartner(pid).catch(() => null) : null;
  return (
    <div className="phone-stage"><main className="phone px-5 pb-12">
      <header className="flex items-center gap-2 h-16"><Logo size={26} /><span className="text-xs tracking-[.2em] text-gold-400">PARTNER</span></header>
      <h1 className="font-display text-3xl font-semibold mt-8">สร้างบัญชีพาร์ทเนอร์</h1>
      {!p ? (
        <div className="mt-6 text-sm text-ink-300 space-y-3">
          <p>ลิงก์หมดอายุหรือไม่ถูกต้อง — บัญชีพาร์ทเนอร์สร้างได้หลังส่งฟอร์มสมัครที่หน้า <Link href="/partner#apply" className="text-gold-300">/partner</Link></p>
          <p>มีบัญชีแล้ว? <Link href="/partner/login" className="text-gold-300">เข้าสู่ระบบ</Link></p>
        </div>
      ) : p.password_hash ? (
        <p className="mt-6 text-sm text-ink-300">บัญชีนี้ตั้งรหัสผ่านแล้ว <Link href="/partner/login" className="text-gold-300">เข้าสู่ระบบ</Link></p>
      ) : (
        <>
          <p className="text-sm text-ink-300 mt-1 mb-8">{p.business_name} · ใช้อีเมลที่สมัครไว้เป็นชื่อผู้ใช้</p>
          <SetPasswordForm token={t!} email={p.email} />
        </>
      )}
    </main></div>
  );
}
