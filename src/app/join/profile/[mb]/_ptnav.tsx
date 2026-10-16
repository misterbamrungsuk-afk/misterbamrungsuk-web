import Link from "next/link";

// เมนู Part-Time 5 ปุ่ม (ตามบอร์ด) — มือถือ: แถบล่าง · จอคอม (lg): แถบเมนูซ้าย พร้อมโลโก้กลับหน้าแรก
// ไฟล์นี้ไม่มีโค้ดฝั่งเซิร์ฟเวอร์ ใช้ได้ทั้งหน้า server และ client (หน้าโปรไฟล์หลัก)

export const ptHref = (c: { mb: string; q: string }, sub = "") => `/join/profile/${c.mb}${sub ? `/${sub}` : ""}${c.q}`;

export type PtKey = "home" | "schedule" | "jobs" | "earnings" | "settings";
const GEAR = "M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z";

export function PtNav({ c, active }: { c: { mb: string; q: string }; active: PtKey }) {
  const items: [PtKey, string, string, React.ReactNode][] = [
    ["home", "หน้าหลัก", "", <path key="p" d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />],
    ["schedule", "ตาราง", "schedule", <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>],
    ["jobs", "งาน", "jobs", <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></>],
    ["earnings", "รายได้", "earnings", <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>],
    ["settings", "ตั้งค่า", "settings", <><circle cx="12" cy="12" r="3" /><path d={GEAR} /></>],
  ];
  return (
    <nav aria-label="เมนู Part Time"
      className="fixed z-40 bottom-0 inset-x-0 mx-auto max-w-[640px] h-[calc(76px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] grid grid-cols-5 items-center text-center font-light text-[#b5a596] text-[12px] border-t border-[rgba(243,234,217,0.07)] bg-[#251d1b] md:rounded-t-2xl
        lg:top-0 lg:right-auto lg:mx-0 lg:max-w-none lg:w-[104px] lg:h-auto lg:pb-6 lg:grid-cols-1 lg:auto-rows-[76px] lg:content-start lg:rounded-none lg:border-t-0 lg:border-r lg:text-[12px]">
      <Link href="/" aria-label="Mister Bamrungsuk · หน้าแรก" className="hidden lg:grid place-items-center h-[76px] mb-4">
        <img src="/brand/logo.png" alt="" width={48} height={48} className="w-12 h-12 object-contain" />
      </Link>
      {items.map(([k, label, sub, icon]) => (
        <Link key={k} href={ptHref(c, sub)} aria-current={active === k ? "page" : undefined}
          className="flex flex-col items-center justify-center gap-[3px] h-full hover:text-[#f3ead9] lg:mx-3 lg:rounded-2xl lg:gap-1.5"
          style={{ color: active === k ? "#e8c472" : "inherit", background: active === k ? "var(--pt-on, transparent)" : undefined }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>{label}
        </Link>
      ))}
    </nav>
  );
}
