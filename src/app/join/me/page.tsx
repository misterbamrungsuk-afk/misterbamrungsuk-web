import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RESUME_COOKIE, liveResume } from "@/lib/join/resume";
import { lineAddUrl } from "@/lib/join/config";
import { LinkRequestForm } from "./link-form";
import { PtLoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Part-Time เข้าสู่ระบบ — Mister Bamrungsuk", robots: { index: false } };

// ปุ่ม "โปรไฟล์ Part-Time" บนหน้าแรก: เครื่องนี้เคยเปิดลิงก์โปรไฟล์แล้ว → เข้าเลย · ยังไม่เคย → ขอลิงก์ทางอีเมลเอง (เบอร์/รหัส MB) · ไม่มีอีเมล → ขอทาง LINE
export default async function PtMe() {
  const mb = await liveResume((await cookies()).get(RESUME_COOKIE)?.value);
  if (mb) redirect(`/join/profile/${mb}`);
  return (
    <main className="mb-v7 min-h-dvh grid place-items-center" style={{ background: "#171211", color: "#f3ead9", padding: "32px 20px" }}>
      <div className="w-full max-w-[420px] flex flex-col gap-4 text-center">
        <img src="/brand/logo.png" alt="" width={64} height={64} className="mx-auto w-16 h-16 object-contain" />
        <h1 className="m-0 font-semibold text-[24px] leading-[1.35]">โปรไฟล์ Part-Time</h1>
        <p className="m-0 text-[14.5px] leading-[1.7] text-[#d9c9b4]">เข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่ตั้งตอนสมัคร เครื่องนี้จะจำไว้ 30 วัน</p>
        <PtLoginForm />
        <LinkRequestForm />
        <p className="m-0 text-[13px] leading-[1.6] text-[#b5a596]">สมัครก่อนมีระบบรหัสผ่าน หรือไม่ได้ใส่อีเมล? ขอลิงก์ทาง LINE แล้วตั้งรหัสผ่านในหน้าตั้งค่า</p>
        <a href={lineAddUrl()} target="_blank" rel="noopener noreferrer" className="h-[52px] rounded-full grid place-items-center font-semibold text-[#e8c472] hover:text-[#e8c472]" style={{ border: "1px solid #e8c472" }}>ขอลิงก์ใหม่ทาง LINE</a>
        <Link href="/join" className="tap justify-center text-[14px] text-[#e8c472] hover:text-[#e8c472]">ยังไม่ได้สมัคร · สมัครร่วมทีม</Link>
        <Link href="/" className="tap justify-center text-[14px] text-[#d9c9b4]">กลับหน้าแรก</Link>
      </div>
    </main>
  );
}
