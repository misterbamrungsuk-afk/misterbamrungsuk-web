import Link from "next/link";
import { readInvite } from "@/lib/market/vendor-auth";
import { listVendors } from "@/lib/market/store";
import { VendorAccept } from "../vendor-portal";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตั้งรหัสผ่านร้านค้า · Mister Bamrungsuk", robots: { index: false } };

export default async function VendorInvitePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const t = (await searchParams).t ?? "";
  const a = await readInvite(t);
  const vendor = a ? (await listVendors()).find((v) => v.id === a.vendor_id) : null;
  return (
    <main className="min-h-dvh bg-ink-900 text-ink-100 grid place-items-center px-4">
      {a && vendor ? <VendorAccept t={t} email={a.email} shop={vendor.name} /> : (
        <div className="glass rounded-3xl p-8 max-w-sm text-center">
          <h1 className="text-xl font-semibold">ลิงก์เชิญหมดอายุหรือไม่ถูกต้อง</h1>
          <p className="text-sm text-ink-300 mt-2">ขอลิงก์ใหม่จากทีมงาน Mister Bamrungsuk</p>
          <Link href="/vendor" className="btn-ghost inline-flex h-11 px-6 rounded-full items-center mt-5">ไปหน้าเข้าสู่ระบบ</Link>
        </div>
      )}
    </main>
  );
}
