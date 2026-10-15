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

export { PtNav, ptHref } from "./_ptnav";
import { ptHref } from "./_ptnav";

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
      <div className="lg:pl-[104px]"><div className="mx-auto w-full max-w-[880px] pb-[calc(100px+env(safe-area-inset-bottom))] lg:pb-12 lg:pt-4">{children}</div></div>
    </div>
  );
}

export const baht = (n: number) => "฿" + Math.round(n).toLocaleString("en-US");

const BANK_LOGO: Record<string, string> = { KBank: "#138f2d", SCB: "#4e2a84", BBL: "#1e4598", KTB: "#1ba5e1", BAY: "#c9a000", ttb: "#0050f0", GSB: "#eb198d", UOB: "#0b3b8c", "พร้อมเพย์": "#113566" };
/** บัญชีรับเงินจากใบสมัคร → แถวบัญชีแบบบอร์ด (ตัวย่อธนาคาร · สี · เลขปิดกลาง) */
export function acctOf(row: Applicant) {
  const no = (row.bank_account ?? "").replace(/\D/g, "");
  if (!no || !row.bank) return null;
  const abbr = /\(([^)]+)\)/.exec(row.bank)?.[1] ?? (row.bank.startsWith("พร้อมเพย์") ? "พร้อมเพย์" : "");
  const short = abbr === "พร้อมเพย์" ? "PP" : abbr === "KBank" ? "K" : abbr ? (abbr.length > 4 ? abbr.slice(0, 3) : abbr) : row.bank.slice(0, 1);
  const name = row.bank.replace(/\s*\([^)]*\)/, "");
  return { short, logo: BANK_LOGO[abbr] ?? "#3a2e2a", name, no: `••• •• ${no.slice(-4)} · ${row.bank_account_name}`, tail: `••${no.slice(-4)}` };
}

/** หัวแบบแถบ 68px พื้น #251d1b (บอร์ด P-Reviews / P-QuickReplies / P-PostCreate) */
export function PtBarHead({ back, title, right }: { back: string; title: string; right?: React.ReactNode }) {
  return (
    <header className="flex items-center gap-3 h-[68px] bg-[#251d1b] lg:rounded-b-2xl" style={{ padding: "12px 16px" }}>
      <Link href={back} aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full bg-[#211a18] text-[#f3ead9] grid place-items-center shrink-0 hover:text-[#f3ead9]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      </Link>
      <h1 className="m-0 flex-1 text-[18px] font-semibold">{title}</h1>
      {right}
    </header>
  );
}
