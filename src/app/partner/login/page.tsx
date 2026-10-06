import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";
import { currentPartner } from "@/lib/partner/auth";
import { LoginForm } from "../auth-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "เข้าสู่ระบบพาร์ทเนอร์ · Mister Bamrungsuk" };

export default async function PartnerLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const dest = next?.startsWith("/partner/portal") ? next : "/partner/portal";
  if (await currentPartner()) redirect(dest);
  return (
    <div className="phone-stage"><main className="phone px-5 pb-12">
      <header className="flex items-center gap-2 h-16"><Logo size={26} /><span className="text-xs tracking-[.2em] text-gold-400">PARTNER</span></header>
      <h1 className="font-display text-3xl font-semibold mt-8">เข้าสู่ระบบพาร์ทเนอร์</h1>
      <p className="text-sm text-ink-300 mt-1 mb-8">จัดการการจอง หน้าร้าน และแพ็กเกจของคุณ</p>
      <LoginForm next={dest} />
    </main></div>
  );
}
