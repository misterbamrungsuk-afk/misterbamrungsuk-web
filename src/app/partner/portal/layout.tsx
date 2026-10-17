import { redirect } from "next/navigation";
import { currentPartner } from "@/lib/partner/auth";
import { ACCOUNT_LABEL } from "@/lib/partner/portal-types";
import { PortalNav, LogoutButton } from "./nav";
import { AvatarView } from "@/components/avatar-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "พอร์ทัลพาร์ทเนอร์ · Mister Bamrungsuk" };

// ทุกหน้าใต้ /partner/portal ต้องล็อกอินพาร์ทเนอร์ (cookie mb_partner)
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const p = await currentPartner();
  if (!p) redirect("/partner/login");
  const st = p.account_status ?? "pending";
  return (
    <div className="phone-stage"><div className="phone pb-28">
      <header className="flex items-center gap-2 h-14 px-5 border-b border-ink-700">
        <span className="font-display text-gold-400 tracking-[.18em] text-sm">MB PARTNER</span>
        <span className="ml-auto text-xs text-ink-300 truncate max-w-[45%]">{p.business_name}</span>
        <a href="/partner/portal/listing" aria-label="รูปโปรไฟล์"><AvatarView as="partner" letter={p.business_name} size={32} /></a>
        <LogoutButton />
      </header>
      {st === "pending" && (
        <p className="mx-5 mt-4 rounded-2xl border border-gold-500/40 bg-gold-500/5 px-4 py-3 text-xs text-ink-200">
          บัญชี{ACCOUNT_LABEL.pending} — ทีมงานกำลังตรวจ QC/สลิป หน้าร้านจะเปิดแสดงได้หลังอนุมัติ
        </p>
      )}
      {st === "expired" && (
        <p className="mx-5 mt-4 rounded-2xl border border-crimson-500/50 bg-crimson-500/10 px-4 py-3 text-xs text-ink-200">แผนโปรโมทหมดอายุ — ต่ออายุได้ที่แท็บแผนโปรโมท</p>
      )}
      <main className="px-5">{children}</main>
      <PortalNav />
    </div></div>
  );
}
