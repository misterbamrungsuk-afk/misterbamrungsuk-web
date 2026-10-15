import Link from "next/link";
import { canResume } from "@/lib/join/resume";
import { extraOf, getByMb, type Applicant, type Extra } from "@/lib/join/store";

// ชิ้นส่วนร่วมของหน้า Part-Time ใต้ "โปรไฟล์ของฉัน" (บอร์ด P-Schedule / ProviderJobboard / MyEarnings / ProviderSettings / Withdraw / P-Reviews)

export type PtCtx = { mb: string; t: string; q: string; row: Applicant; x: Extra };

/** ตรวจสิทธิ์เจ้าของรหัส แล้วคืนข้อมูลใบสมัคร (null = ไม่มีสิทธิ์ / ไม่พบ) */
export async function loadPt(params: Promise<{ mb: string }>, searchParams: Promise<{ t?: string }>): Promise<PtCtx | "forbidden" | null> {
  const { mb } = await params;
  const { t } = await searchParams;
  if (!/^MB-\d{7,}$/.test(mb) || !(await canResume(mb, t))) return "forbidden";
  const row = await getByMb(mb);
  if (!row) return null;
  return { mb, t: t ?? "", q: t ? `?t=${encodeURIComponent(t)}` : "", row, x: extraOf(row) };
}

export const ptHref = (c: { mb: string; q: string }, sub = "") => `/join/profile/${c.mb}${sub ? `/${sub}` : ""}${c.q}`;

type Key = "home" | "schedule" | "jobs" | "earnings" | "settings";
const GEAR = "M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z";

/** เมนูล่าง Part-Time 5 ปุ่ม (ตามบอร์ด) */
export function PtNav({ c, active }: { c: { mb: string; q: string }; active: Key }) {
  const items: [Key, string, string, React.ReactNode][] = [
    ["home", "หน้าหลัก", "", <path key="p" d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />],
    ["schedule", "ตาราง", "schedule", <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>],
    ["jobs", "งาน", "jobs", <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></>],
    ["earnings", "รายได้", "earnings", <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>],
    ["settings", "ตั้งค่า", "settings", <><circle cx="12" cy="12" r="3" /><path d={GEAR} /></>],
  ];
  return (
    <nav aria-label="เมนู Part Time" className="fixed bottom-0 inset-x-0 z-40 mx-auto max-w-[640px] grid grid-cols-5 items-center text-center font-light text-[#b5a596] border-t border-[rgba(243,234,217,0.07)] bg-[#251d1b] md:rounded-t-2xl"
      style={{ height: "calc(76px + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)", fontSize: 10.5 }}>
      {items.map(([k, label, sub, icon]) => (
        <Link key={k} href={ptHref(c, sub)} aria-current={active === k ? "page" : undefined} className="flex flex-col items-center gap-[3px] hover:text-[#f3ead9]" style={{ color: active === k ? "#e8c472" : "inherit" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>{label}
        </Link>
      ))}
    </nav>
  );
}

/** หัวหน้าย่อย: ปุ่มกลับวงกลม 42 + ชื่อหน้า 19px (บอร์ด Withdraw / ProviderSettings / ProviderJobboard) */
export function PtHead({ back, title, right }: { back: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-[10px]" style={{ padding: 16 }}>
      <Link href={back} aria-label="ย้อนกลับ" className="w-[42px] h-[42px] rounded-full bg-[#251d1b] text-[#f3ead9] grid place-items-center shrink-0 hover:text-[#f3ead9]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      </Link>
      <h1 className="m-0 text-[19px] font-semibold flex-1">{title}</h1>
      {right}
    </div>
  );
}

/** กรอบหน้า Part-Time: พื้น #171211 · เว้นที่เมนูล่าง */
export function PtPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9", lineHeight: "normal" }}>
      <div className="mx-auto w-full max-w-[720px]" style={{ paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>{children}</div>
    </div>
  );
}

export const baht = (n: number) => "฿" + Math.round(n).toLocaleString("en-US");
