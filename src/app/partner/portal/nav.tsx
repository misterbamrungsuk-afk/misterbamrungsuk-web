"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/partner/portal", label: "หน้าหลัก", d: "M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/partner/portal/bookings", label: "การจอง", d: "M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1z" },
  { href: "/partner/portal/listing", label: "หน้าร้าน", d: "M4 9h16l-1-5H5zm0 0v11h16V9M9 20v-6h6v6" },
  { href: "/partner/portal/wallet", label: "กระเป๋าเงิน", d: "M3 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm0 0 2-3h11v3m-1 6h2" },
  { href: "/partner/portal/package", label: "แผนโปรโมท", d: "M12 3 3 8l9 5 9-5zm-9 9 9 5 9-5M3 16l9 5 9-5" },
];

const ROOMS = { href: "/partner/portal/rooms", label: "ห้องพัก", d: "M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 14h18M7 9V6h4v3m2 0V6h4v3M3 18v2m18-2v2" };

/** hotel = พาร์ทเนอร์โรงแรม → เพิ่มแท็บ "ห้องพัก" (ประเภทห้อง/ราคา/จำนวนห้อง) */
export function PortalNav({ hotel = false }: { hotel?: boolean }) {
  const path = usePathname();
  const tabs = hotel ? [...TABS.slice(0, 2), ROOMS, ...TABS.slice(2)] : TABS;
  return (
    <nav aria-label="เมนูพาร์ทเนอร์" className="fixed bottom-0 inset-x-0 z-30 md:static md:mt-3 md:px-5">
      <div className={`max-w-[480px] mx-auto grid ${hotel ? "grid-cols-6" : "grid-cols-5"} border-t border-ink-600 bg-ink-900/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:max-w-none md:border md:rounded-2xl md:pb-0 md:overflow-hidden`}>
        {tabs.map((t) => {
          const on = t.href === "/partner/portal" ? path === t.href : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
              className={`flex flex-col md:flex-row md:justify-center items-center gap-1 md:gap-2 py-2.5 md:py-3 ${hotel ? "text-[11px]" : "text-[12px]"} md:text-sm text-center leading-tight ${on ? "text-gold-300 md:bg-gold-500/10" : "text-ink-300"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d={t.d} /></svg>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button type="button" className="shrink-0 min-h-10 px-2 text-xs text-[#9a8a85] hover:text-gold-300 ml-1"
      onClick={async () => { await fetch("/api/partner/auth/logout", { method: "POST" }).catch(() => null); router.replace("/partner/login"); }}>
      ออก
    </button>
  );
}
