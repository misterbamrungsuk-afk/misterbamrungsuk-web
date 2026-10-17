import { OwnerWallet } from "@/components/owner-wallet";

export const dynamic = "force-dynamic";

// กระเป๋าเงินพาร์ทเนอร์ — ค่าห้องจากนัดที่จบแล้วเข้ากระเป๋าอัตโนมัติ · ขอถอนเข้าบัญชีได้เอง
export default function PartnerWalletPage() {
  return (
    <div className="py-5 flex flex-col gap-3">
      <h1 className="m-0 text-[20px] font-semibold">กระเป๋าเงิน</h1>
      <OwnerWallet api="/api/partner/wallet" source="ค่าห้องจากนัดที่จบแล้ว" />
    </div>
  );
}
