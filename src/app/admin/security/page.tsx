import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { statusFor } from "@/lib/admin-mfa";
import { PageHead } from "../admin-nav";
import { SecurityPanel } from "./panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "ความปลอดภัยบัญชี — แอดมิน" };

// ตั้งค่ายืนยันตัวตน 2 ชั้น (แอป Authenticator) ของบัญชีตัวเอง · CEO: บังคับทุกบัญชี + ล้าง 2 ชั้นให้คนอื่น
export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ required?: string }> }) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s) redirect("/admin-login");
  const sp = await searchParams;
  const status = await statusFor(s).catch(() => null);
  return (
    <>
      <PageHead title="ความปลอดภัยบัญชี" sub="ยืนยันตัวตน 2 ชั้น · เข้าสู่ระบบต้องใช้รหัสผ่าน + รหัส 6 หลักจากแอปในโทรศัพท์" />
      {status ? <SecurityPanel initial={status} required={!!sp.required} /> : (
        <p role="alert" className="rounded-2xl border border-crimson-500 bg-crimson-500/10 px-4 py-3 text-sm">ระบบยืนยันตัวตน 2 ชั้นขัดข้องชั่วคราว ลองโหลดหน้านี้ใหม่อีกครั้ง</p>
      )}
    </>
  );
}
