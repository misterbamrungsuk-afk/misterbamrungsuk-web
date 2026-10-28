import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// ลิงก์เดิม (แจ้งเตือน "รอ CEO อนุมัติ" ชี้มาที่นี่): ห้อง CEO ย้ายไปลิงก์แยก /ceo (รหัส CEO · 28 ต.ค. 2569)
// CEO → /ceo · แอดมินอื่น → /admin/ceo-view (ดูอย่างเดียว)
export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  const q = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? `?d=${d}` : "";
  redirect((s?.role === "ceo" ? "/ceo" : "/admin/ceo-view") + q);
}
