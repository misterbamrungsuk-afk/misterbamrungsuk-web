import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, canAccess, homeFor, verifySession } from "@/lib/admin-auth";
import { listStays, stayRecon } from "@/lib/hotels/store";
import { PageHead } from "../admin-nav";
import { StaysAdmin } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "จองห้องพัก · แอดมิน Mister Bamrungsuk" };

// การจองห้องพักโรงแรมพาร์ทเนอร์ — ดูทุกรายการ · คืนเงินเต็ม (สิทธิ์เดียวกับกระเป๋าเงิน: CEO / super / finance)
export default async function StaysAdminPage() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s) redirect("/admin-login");
  if (!canAccess(s.role, "/admin/wallet")) redirect(`${homeFor(s.role)}?denied=1`);
  const [rows, recon] = await Promise.all([listStays({ limit: 1000 }).catch(() => []), stayRecon().catch(() => null)]);
  return (
    <>
      <PageHead title="จองห้องพักโรงแรม" sub="ลูกค้าจ่ายจากกระเป๋า → เงินพัก (hotel_escrow) → หลังเช็กเอาต์แบ่งเข้ากระเป๋าโรงแรม (หัก % แพลตฟอร์ม)" />
      <StaysAdmin initial={rows} recon={recon} />
    </>
  );
}
