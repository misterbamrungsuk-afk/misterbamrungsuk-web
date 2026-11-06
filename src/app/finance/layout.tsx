import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, canAccess, homeFor, verifySession } from "@/lib/admin-auth";

export const metadata = { title: "วางแผนการเงิน — Mister Bamrungsuk", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// หลังบ้านการเงิน (path แยกจาก /admin) — CEO / Super / การเงิน · middleware ตรวจแล้ว ตรวจซ้ำที่นี่อีกชั้น
export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s) redirect("/admin-login?next=/finance");
  if (!canAccess(s.role, "/finance")) redirect(`${homeFor(s.role)}?denied=1`);
  return <div className="fin-root min-h-dvh overflow-x-clip">{children}</div>;
}
