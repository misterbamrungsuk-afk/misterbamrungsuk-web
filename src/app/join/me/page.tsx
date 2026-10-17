import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RESUME_COOKIE, readResume } from "@/lib/join/resume";
import { lineAddUrl } from "@/lib/join/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "โปรไฟล์ Part-Time — Mister Bamrungsuk", robots: { index: false } };

// ปุ่ม "โปรไฟล์ Part-Time" บนหน้าแรก: เครื่องนี้เคยเปิดลิงก์โปรไฟล์แล้ว → เข้าเลย · ยังไม่เคย → บอกวิธีเข้า (ลิงก์จากทีมงาน) / สมัคร
export default async function PtMe() {
  const mb = readResume((await cookies()).get(RESUME_COOKIE)?.value);
  if (mb) redirect(`/join/profile/${mb}`);
  return (
    <main className="mb-v7 min-h-dvh grid place-items-center" style={{ background: "#171211", color: "#f3ead9", padding: "32px 20px" }}>
      <div className="w-full max-w-[420px] flex flex-col gap-4 text-center">
        <img src="/brand/logo.png" alt="" width={64} height={64} className="mx-auto w-16 h-16 object-contain" />
        <h1 className="m-0 font-semibold text-[24px] leading-[1.35]">โปรไฟล์ Part-Time</h1>
        <p className="m-0 text-[14.5px] leading-[1.7] text-[#d9c9b4]">เปิดจากลิงก์โปรไฟล์ที่ทีมงานส่งให้ทาง LINE หรืออีเมลหลังสมัคร เปิดครั้งเดียว เครื่องนี้จะจำไว้ 30 วัน ครั้งต่อไปกดปุ่มนี้ได้เลย</p>
        <a href={lineAddUrl()} target="_blank" rel="noopener noreferrer" className="h-[52px] rounded-full grid place-items-center font-semibold bg-[#e8c472] text-[#1b130b] hover:text-[#1b130b]">ขอลิงก์ใหม่ทาง LINE</a>
        <Link href="/join" className="h-[52px] rounded-full grid place-items-center font-semibold text-[#e8c472] hover:text-[#e8c472]" style={{ border: "1px solid #e8c472" }}>ยังไม่ได้สมัคร · สมัครร่วมทีม</Link>
        <Link href="/" className="tap justify-center text-[14px] text-[#d9c9b4]">กลับหน้าแรก</Link>
      </div>
    </main>
  );
}
