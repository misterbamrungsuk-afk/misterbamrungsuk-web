import { allBalances, ledgerSum, listTopups } from "@/lib/wallet";
import { WalletAdmin } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "กระเป๋าเงิน · แอดมิน Mister Bamrungsuk" };

// คิวเติมเงิน (Slip2Go ตรวจไม่ผ่าน → แอดมินตัดสิน) · ยอดทุกบัญชี · ผลรวม ledger ต้อง = 0 · ปรับยอดพร้อมเหตุผล
export default async function WalletAdminPage() {
  const [topups, accounts, sum] = await Promise.all([listTopups({ limit: 200 }).catch(() => []), allBalances().catch(() => []), ledgerSum().catch(() => NaN)]);
  return <WalletAdmin initial={{ topups, accounts, sum }} />;
}
