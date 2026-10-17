import Link from "next/link";
import { Logo } from "@/components/ui";
import { readRegisterToken, resetStillValid } from "@/lib/partner/auth";
import { getPartner } from "@/lib/partner/store";
import { SetPasswordForm } from "../auth-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "สร้างบัญชีพาร์ทเนอร์ · Mister Bamrungsuk" };

// ตั้งรหัสผ่านหลังส่งฟอร์มสมัคร — ต้องมาจากลิงก์ที่มี token (?t=)
export default async function PartnerRegister({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const tk = readRegisterToken(t);
  const p = tk ? await getPartner(tk.pid).catch(() => null) : null;
  // ลิงก์รีเซ็ตจากแอดมิน = ตั้งใหม่ได้แม้มีรหัสแล้ว (ครั้งเดียว) · ลิงก์ใบสมัคร = ตั้งครั้งแรกเท่านั้น
  const canSet = !!p && (tk?.reset ? resetStillValid(tk.fp, p.password_hash) : !p.password_hash);
  return (
    <div className="phone-stage"><main className="phone px-5 pb-12">
      <header className="flex items-center gap-2 h-16"><Logo size={26} /><span className="text-xs tracking-[.2em] text-gold-400">PARTNER</span></header>
      <h1 className="font-display text-3xl font-semibold mt-8">{tk?.reset ? "ตั้งรหัสผ่านใหม่" : "สร้างบัญชีพาร์ทเนอร์"}</h1>
      {!p ? (
        <div className="mt-6 text-sm text-ink-300 space-y-3">
          <p>ลิงก์หมดอายุหรือไม่ถูกต้อง — บัญชีพาร์ทเนอร์สร้างได้หลังส่งฟอร์มสมัครที่หน้า <Link href="/partner#apply" className="text-gold-300">/partner</Link></p>
          <p>มีบัญชีแล้ว? <Link href="/partner/login" className="text-gold-300">เข้าสู่ระบบ</Link></p>
        </div>
      ) : !canSet ? (
        <p className="mt-6 text-sm text-ink-300">{tk?.reset ? "ลิงก์นี้ถูกใช้ไปแล้ว · ขอลิงก์ใหม่จากทีมงาน หรือ " : "บัญชีนี้ตั้งรหัสผ่านแล้ว "}<Link href="/partner/login" className="text-gold-300">เข้าสู่ระบบ</Link></p>
      ) : (
        <>
          <p className="text-sm text-ink-300 mt-1 mb-8">{p.business_name} · ใช้อีเมลที่สมัครไว้เป็นชื่อผู้ใช้</p>
          <SetPasswordForm token={t!} email={p.email} />
        </>
      )}
    </main></div>
  );
}
