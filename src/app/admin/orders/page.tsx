import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import AdminOrdersClient from "./client";

export const dynamic = "force-dynamic";

// การจองทั้งหมด — สิทธิ์ตัดสิน (ย้ายเงิน) = ผู้เข้าหน้า /admin/wallet ได้ · ?tab=noshow เปิดแท็บผิดนัด (ลิงก์จากแจ้งเตือน)
export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [s, { tab }] = await Promise.all([verifySession((await cookies()).get(ADMIN_COOKIE)?.value), searchParams]);
  return <AdminOrdersClient canResolve={!!s && canAccess(s.role, "/admin/wallet")} initialTab={tab} />;
}
