"use client";

import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";

export default function TermsPage() {
  const { t, lang } = useI18n();
  const sections = lang === "th" ? [
    ["1. เกี่ยวกับแพลตฟอร์ม", "MorD เป็นพื้นที่กลางให้ผู้ใช้ค้นหาและว่าจ้าง “หมอนวด” เพื่อสุขภาพ การว่าจ้างเป็นสัญญาโดยตรงระหว่างผู้ใช้ทั้งสองฝ่าย โดยแพลตฟอร์มมีระบบชำระเงิน Escrow ในแอปเพื่อความปลอดภัยของทั้งสองฝ่าย"],
    ["2. การสมัครใช้งาน", "สำหรับบุคคลอายุ 18 ปีขึ้นไปเท่านั้น ล็อกอินผ่านบัญชี Google พร้อมยืนยันตัวตน (KYC) ก่อนใช้ฟีเจอร์การสร้างเนื้อหา การใช้งานฟรี แพลตฟอร์มอาจเรียกเก็บค่าธรรมเนียมในอนาคตโดยแจ้งล่วงหน้า"],
    ["3. ข้อห้าม", "ห้ามเสนอบริการทางเพศหรือผิดกฎหมายทุกประเภท ห้ามใช้รูปภาพที่สร้างด้วย AI แอบอ้างเป็นบุคคลอื่น ห้ามรีวิวโดยไม่มีการว่าจ้างจริง ห้ามสแปมหรือสร้างบัญชีจำนวนมาก"],
    ["4. ความปลอดภัย", "นัดพบในสถานที่สาธารณะ ชำระเงินผ่านระบบในแอปเท่านั้น (มัดจำ 50% / ค่าจ้างส่วนที่เหลือ 50% หลังจบงาน) แจ้งคนใกล้ตัวก่อนพบปะ และรีพอร์ทพฤติกรรมผิดปกติได้ทันที"],
    ["5. การระงับบัญชี", "ผู้ละเมิดข้อกำหนดจะได้รับ strike ครบ 3 ครั้งระบบระงับบัญชีอัตโนมัติ ผู้ใช้สามารถลบบัญชีได้เองตลอดเวลา"],
  ] as [string, string][] : [
    ["1. About", "MorD is a marketplace connecting users with professional massage therapists for health and relaxation. Hiring is a direct contract between users; the platform provides in-app escrow for safety."],
    ["2. Eligibility", "18+ only. Sign in with Google, verify identity (KYC) before posting. Free to use; fees may apply in the future with notice."],
    ["3. Prohibited", "No sexual or illegal services, AI-generated impersonation photos, reviews without real hires, spam, or mass account creation."],
    ["4. Safety", "Meet in public places, pay only via in-app escrow (50% deposit / 50% after completion), tell someone you trust, report anything suspicious."],
    ["5. Enforcement", "3-strike policy leads to automatic suspension. You may delete your account at any time."],
  ] as [string, string][];

  return (
    <>
      <TopBar back="/profile" title={`📜 ${t.aboutTerms}`} />
      <div className="px-4 py-4 space-y-3">
        {sections.map(([h, b]) => (
          <section key={h} className="glass rounded-2xl p-4">
            <h2 className="font-semibold text-gold-300 mb-1.5">{h}</h2>
            <p className="text-sm text-ink-200 leading-relaxed">{b}</p>
          </section>
        ))}
      </div>
    </>
  );
}
