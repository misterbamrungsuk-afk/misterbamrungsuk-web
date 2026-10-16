import Link from "next/link";
import { TopBar } from "@/components/shell";
import { currentCustomer } from "@/lib/customer/auth";
import { GiftBox } from "./gift";

export const dynamic = "force-dynamic";
export const metadata = { title: "ระดับสมาชิก — Mister Bamrungsuk" };

// บอร์ด C-Membership — ระดับสมาชิก (รายเดือน/ชุดครั้ง) รอกำหนดสิทธิประโยชน์ก่อนเปิด · ส่วน "ซื้อเป็นของขวัญ" + ใช้โค้ด (C-Redeem) ใช้งานจริงแล้ว
export default async function MembershipPage() {
  const me = await currentCustomer().catch(() => null);
  return (
    <div className="pb-8">
      <TopBar back="/profile" title="ระดับสมาชิก" />
      <div className="flex flex-col gap-[14px]" style={{ padding: "8px 18px 0" }}>
        <div className="relative overflow-hidden rounded-[20px]" style={{ padding: 18, background: "linear-gradient(135deg, #2b1f12 0%, #211a18 60%)", border: "1px solid rgba(212,175,55,.5)" }}>
          <div className="text-[12px] tracking-[3px] font-semibold text-[#e8c472]">สมาชิก MB</div>
          <div className="font-bold text-[22px] mt-1.5">ระดับสมาชิกเปิดเร็ว ๆ นี้</div>
          <div className="text-[12.5px] font-light text-[#d9c9b4] mt-1">สิทธิพิเศษและราคาพิเศษสำหรับสมาชิกกำลังจะมา · ตอนนี้นัดเพื่อนได้ตามปกติผ่านกระเป๋าเงินในแอป</div>
          <div className="absolute rounded-full" style={{ right: -20, top: -20, width: 120, height: 120, border: "1px solid rgba(232,196,114,0.6)" }} />
        </div>
        <Link href="/membership/redeem" className="flex items-center gap-3 rounded-[14px] bg-[#211a18] text-[#f3ead9] hover:text-[#f3ead9]" style={{ padding: "12px 14px", border: "1px solid rgba(243,234,217,0.07)" }}>
          <span className="w-9 h-9 rounded-xl grid place-items-center text-[#e8c472] bg-[#251d1b]" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M3 12h18M12 8v13" /></svg></span>
          <span className="flex-1"><b className="font-medium text-[14.5px]">มีโค้ดของขวัญ / โปรโมชัน?</b><span className="block text-[12px] font-light text-[#d9c9b4]">ใช้โค้ดรับเครดิตเข้ากระเป๋า</span></span>
          <span className="text-[#e8c472]">›</span>
        </Link>
        <GiftBox loggedIn={!!me} />
      </div>
    </div>
  );
}
