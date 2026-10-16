import Link from "next/link";
import { TopBar } from "@/components/shell";

export const metadata = { title: "ระดับสมาชิก — Mister Bamrungsuk" };

// บอร์ด C-Membership — ระดับสมาชิกลูกค้าไม่อยู่ในรอบเปิด 20 พ.ย. (แผน: ธ.ค.–ก.พ.) · แสดงสถานะเร็ว ๆ นี้
export default function MembershipPage() {
  return (
    <div className="pb-8">
      <TopBar back="/profile" title="ระดับสมาชิก" />
      <div className="flex flex-col items-center text-center gap-3" style={{ padding: "56px 24px 0" }}>
        <div className="w-[88px] h-[88px] rounded-full grid place-items-center text-[#e8c472] text-[34px]" style={{ border: "1px solid rgba(232,196,114,.55)" }} aria-hidden="true">♛</div>
        <h1 className="m-0 font-semibold text-[22px]">ระดับสมาชิกเปิดเร็ว ๆ นี้</h1>
        <p className="m-0 text-[14px] text-[#d9c9b4] max-w-[300px]">สิทธิพิเศษและของขวัญสำหรับสมาชิกกำลังจะมา · ตอนนี้นัดเพื่อนได้ตามปกติผ่านกระเป๋าเงินในแอป</p>
        <Link href="/" className="mt-3 h-12 px-6 rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">ดูเพื่อนในระบบ</Link>
      </div>
    </div>
  );
}
