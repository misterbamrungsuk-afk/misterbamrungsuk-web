import Link from "next/link";
import { BrandHeader } from "@/components/mb/ui";

// ชิ้นส่วนร่วมของหน้า KYC / บัญชีรับเงิน / ผลตรวจ / อบรม / สมัครสำเร็จ (v7 · บอร์ด D2/D3/D5/P-Done/P-Training)
// มือถือเต็มจอ · md ขึ้นไปเป็นคอลัมน์กลางกว้าง 640px บนพื้นเข้ม
export const C = { bg: "#171211", s1: "#211a18", s2: "#251d1b", ln: "rgba(243,234,217,.14)", red: "#e8c472", gold: "#e8c472", goldL: "#e8c472", tx: "#f3ead9", mut: "#d9c9b4", pink: "#ff8a9a" };
export const RED_GRAD = "#e8c472";

export function Page({ children, padBottom = true }: { children: React.ReactNode; padBottom?: boolean }) {
  return (
    <div className="mb-v7 min-h-dvh md:bg-[#0f0b0a]">
      <BrandHeader />
      <main className={`mb-v7 mx-auto w-full max-w-[640px] relative md:mt-6 md:rounded-[20px] ${padBottom ? "pb-40 md:pb-12" : "pb-8"}`}>
        {children}
      </main>
    </div>
  );
}

export function StepHeader({ step, title, back }: { step: number; title: string; back: string }) {
  return (
    <>
      <div className="flex items-center gap-3 px-4 md:px-6 pt-4 pb-2">
        <Link href={back} aria-label="ย้อนกลับ" className="shrink-0 w-11 h-11 rounded-full grid place-items-center bg-[#251d1b] text-[#f3ead9] hover:text-[#f3ead9]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-[#e8c472]">ขั้นที่ {step} / 5</div>
          <h1 className="font-semibold text-lg leading-snug m-0">{title}</h1>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1 px-4 md:px-6" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => <span key={i} className="h-1 rounded-[2px]" style={{ background: i <= step ? C.gold : C.ln }} />)}
      </div>
    </>
  );
}

export function Forbidden() {
  return (
    <Page padBottom={false}>
      <div className="px-4 pt-24 text-center flex flex-col items-center gap-3">
        <h1 className="text-2xl font-semibold">ลิงก์หมดอายุหรือไม่มีสิทธิ์</h1>
        <p className="text-sm font-light" style={{ color: C.mut }}>กรุณาเปิดจากลิงก์ที่ได้รับหลังสมัคร หรือติดต่อแอดมินทาง LINE</p>
      </div>
    </Page>
  );
}

/** แถบปุ่มล่างจอ: มือถือติดล่าง (safe-area) · md ขึ้นไปอยู่ท้ายเนื้อหา */
export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] bg-[linear-gradient(180deg,rgba(23,18,17,0),#171211_30%)] md:static md:z-auto md:bg-none md:px-6 md:pt-6 md:pb-0">
      <div className="mx-auto max-w-[608px] flex flex-col gap-3">{children}</div>
    </div>
  );
}

export const ctaStyle: React.CSSProperties = {
  minHeight: 52, borderRadius: 14, border: 0, background: "#e8c472",
  color: "#1b130b", fontWeight: 600, fontSize: 16,
  display: "flex", alignItems: "center", justifyContent: "center", width: "100%",
};
