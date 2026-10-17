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

export function PortalNav() {
  const path = usePathname();
  return (
    <nav aria-label="เมนูพาร์ทเนอร์" className="fixed bottom-0 inset-x-0 z-30">
      <div className="max-w-[480px] mx-auto grid grid-cols-5 border-t border-ink-600 bg-ink-900/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => {
          const on = t.href === "/partner/portal" ? path === t.href : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${on ? "text-gold-300" : "text-ink-300"}`}>
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
    <button type="button" className="text-xs text-[#9a8a85] hover:text-gold-300 ml-2"
      onClick={async () => { await fetch("/api/partner/auth/logout", { method: "POST" }).catch(() => null); router.replace("/partner/login"); }}>
      ออก
    </button>
  );
}
