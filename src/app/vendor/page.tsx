import { currentVendor } from "@/lib/market/vendor-auth";
import { vendorData } from "@/lib/market/vendor-data";
import { VendorLogin, VendorPortal } from "./vendor-portal";

export const dynamic = "force-dynamic";
export const metadata = { title: "พอร์ทัลร้านค้า · Mister Bamrungsuk", robots: { index: false } };

// พอร์ทัลร้านค้า (สาธารณะแต่ต้องล็อกอิน cookie mb_vendor) — บัญชีสร้างจากลิงก์เชิญของแอดมินเท่านั้น
export default async function VendorPage() {
  const me = await currentVendor();
  return (
    <main className="min-h-dvh bg-ink-900 text-ink-100">
      {me ? <VendorPortal email={me.account.email} initial={await vendorData(me.vendor)} /> : <VendorLogin />}
    </main>
  );
}
