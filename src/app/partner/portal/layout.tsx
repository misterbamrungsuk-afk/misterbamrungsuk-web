import { redirect } from "next/navigation";
import { currentPartner } from "@/lib/partner/auth";
import { ACCOUNT_LABEL } from "@/lib/partner/portal-types";
import { qcPassed } from "@/lib/partner/kind";
import { PortalNav, LogoutButton } from "./nav";
import { AvatarView } from "@/components/avatar-editor";
import { NoticeBell } from "@/components/notice-inbox";
import { isHotelPartner } from "@/lib/hotels/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "พอร์ทัลพาร์ทเนอร์ · Mister Bamrungsuk" };

// ทุกหน้าใต้ /partner/portal ต้องล็อกอินพาร์ทเนอร์ (cookie mb_partner)
// มือถือ = คอลัมน์เดียว + แท็บล่าง · เดสก์ท็อป = กว้างขึ้น (max 1040px) + แท็บด้านบน
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const p = await currentPartner();
  if (!p) redirect("/partner/login");
  const st = p.account_status ?? "pending";
  const waitQc = (st === "approved" || st === "active") && !qcPassed(p);
  return (
    <div className="min-h-dvh bg-ink-900 text-ink-100">
      <div className="mx-auto w-full max-w-[480px] md:max-w-[1040px] pb-28 md:pb-10">
        <header className="flex items-center gap-2 h-14 px-5 border-b border-ink-700">
          <span className="font-display text-gold-400 tracking-[.18em] text-sm shrink-0">MB PARTNER</span>
          <span className="ml-auto text-xs text-ink-300 truncate min-w-0">{p.business_name}</span>
          <NoticeBell api="/api/partner/notifications" href="/partner/portal/notifications" />
          <a href="/partner/portal/listing" aria-label="รูปโปรไฟล์" className="shrink-0"><AvatarView as="partner" letter={p.business_name} size={32} /></a>
          <LogoutButton />
        </header>
        <PortalNav hotel={await isHotelPartner(p).catch(() => false)} />
        {st === "pending" && (
          <p className="mx-5 mt-4 rounded-2xl border border-gold-500/40 bg-gold-500/5 px-4 py-3 text-xs text-ink-200">
            บัญชี{ACCOUNT_LABEL.pending} — ทีมงานกำลังตรวจ QC/สลิป หน้าร้านจะเปิดแสดงได้หลังอนุมัติ
          </p>
        )}
        {waitQc && (
          <p className="mx-5 mt-4 rounded-2xl border border-gold-500/40 bg-gold-500/5 px-4 py-3 text-xs text-ink-200">
            รอผ่าน QC ก่อนเปิดแสดง — ชำระแผนโปรโมทแล้ว ร้านจะแสดงต่อลูกค้าหลังทีมงานตรวจ QC สถานที่ผ่าน · <a href="/partner/qc" className="text-gold-300 underline">นัด QC</a>
          </p>
        )}
        {st === "expired" && (
          <p className="mx-5 mt-4 rounded-2xl border border-crimson-500/50 bg-crimson-500/10 px-4 py-3 text-xs text-ink-200">แผนโปรโมทหมดอายุ — ต่ออายุได้ที่แท็บแผนโปรโมท</p>
        )}
        <main className="px-5">{children}</main>
      </div>
    </div>
  );
}
