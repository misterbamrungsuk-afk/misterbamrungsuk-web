import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { allBalances, ledgerSum, listTopups } from "@/lib/wallet";
import { getMoney } from "@/lib/wallet/settings";
import { reconcile } from "@/lib/wallet/reconcile";
import { ADJUST_BUCKETS, ownerDirectory } from "@/lib/payouts/owners";
import { WalletAdmin } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "กระเป๋าเงิน · แอดมิน Mister Bamrungsuk" };

// คิวเติมเงิน (Slip2Go ตรวจไม่ผ่าน → แอดมินตัดสิน) · ยอดทุกบัญชี · ผลรวม ledger ต้อง = 0 · ปรับยอดพร้อมเหตุผล (CEO)
export default async function WalletAdminPage() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  const [topups, accounts, sum, money, owners] = await Promise.all([listTopups({ limit: 200 }).catch(() => []), allBalances().catch(() => []), ledgerSum().catch(() => NaN), getMoney(), ownerDirectory().catch(() => [])]);
  const recon = await reconcile().catch(() => null);
  return <WalletAdmin initial={{ topups, accounts, sum }} money={money} recon={recon} isCeo={s?.role === "ceo"} owners={owners} buckets={ADJUST_BUCKETS} />;
}
