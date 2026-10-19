import Link from "next/link";
import { BrandHeader } from "@/components/mb/ui";

// ชิ้นส่วนร่วมของหน้า KYC / บัญชีรับเงิน / ผลตรวจ / อบรม / สมัครสำเร็จ (v7 · บอร์ด D2/D3/D5/P-Done/P-Training)
// มือถือเต็มจอ · md ขึ้นไปเป็นคอลัมน์กลางกว้าง 640px บนพื้นเข้ม
export const C = { bg: "#171211", s1: "#211a18", s2: "#251d1b", ln: "rgba(243,234,217,.14)", red: "#e8c472", gold: "#e8c472", goldL: "#e8c472", tx: "#f3ead9", mut: "#d9c9b4", pink: "#ff8a9a" };
export const RED_GRAD = "#e8c472";

export function Page({ children, padBottom = true }: { children: React.ReactNode; padBottom?: boolean }) {
  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9", fontSize: 15, lineHeight: 1.7 }}>
      <BrandHeader tone="bar" small />
      <main className={`mb-panel mx-auto w-full max-w-[720px] relative ${padBottom ? "pb-10" : "pb-8"}`}>{children}</main>
    </div>
  );
}

/** หัวหน้าย่อยตามบอร์ด D2/D3: ปุ่มกลับ 44px + ชื่อหน้า 20px (step ไว้ใช้ภายหลัง ไม่แสดง) */
export function StepHeader({ title, back, eyebrow }: { step?: number; title: string; back: string; eyebrow?: string }) {
  return (
    <div className="flex items-center gap-3" style={{ padding: "20px 20px 10px" }}>
      <Link href={back} aria-label="ย้อนกลับ" className="shrink-0 w-11 h-11 rounded-full grid place-items-center bg-[#251d1b] text-[#f3ead9] hover:text-[#f3ead9]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      </Link>
      <div className="min-w-0">
        {eyebrow && <div className="text-[13px] text-[#e8c472] font-light">{eyebrow}</div>}
        <h1 className="m-0 font-semibold text-[20px] leading-[1.35]">{title}</h1>
      </div>
    </div>
  );
}

export function Forbidden() {
  return (
    <Page padBottom={false}>
      <div className="px-4 pt-24 text-center flex flex-col items-center gap-3">
        <h1 className="text-2xl font-semibold">ลิงก์หมดอายุหรือไม่มีสิทธิ์</h1>
        <p className="text-sm font-light" style={{ color: C.mut }}>กรุณาเปิดจากลิงก์ที่ได้รับหลังสมัคร หรือติดต่อแอดมินทาง LINE</p>
        <a href="/join/me" className="min-h-12 px-5 rounded-full grid place-items-center font-semibold bg-[#e8c472] text-[#1b130b] hover:text-[#1b130b]">ขอลิงก์ใหม่ทางอีเมล</a>
      </div>
    </Page>
  );
}

/** ปุ่มท้ายเนื้อหา (บอร์ดวางปุ่มต่อท้ายฟอร์ม) */
export function BottomBar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4" style={{ padding: "26px 20px 0" }}>{children}</div>;
}

export const ctaStyle: React.CSSProperties = {
  minHeight: 56, borderRadius: 16, border: 0, background: "#e8c472", color: "#1b130b", fontWeight: 600, fontSize: 17,
  display: "grid", placeItems: "center", width: "100%", textAlign: "center", padding: "0 16px",
};
