import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { AdminNav, DeniedBanner } from "./admin-nav";

export const metadata = { title: "แอดมิน — Mister Bamrungsuk" };
export const dynamic = "force-dynamic";

// หลังบ้านแอดมิน: อยู่นอก (app) จึงไม่ถูกบีบในกรอบมือถือ 480px และไม่มีแถบเมนูลูกค้า
// ตรวจ session ซ้ำที่นี่อีกชั้น (กันกรณี middleware ถูกข้าม)
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!session) redirect("/admin-login");

  return (
    <div className="min-h-dvh lg:flex">
      <AdminNav email={session.email} role={session.role} />
      <main className="flex-1 min-w-0 px-4 lg:px-8 py-5 lg:py-7 pb-16 [&_.grid>*]:min-w-0">
        <Suspense><DeniedBanner /></Suspense>
        {children}
      </main>
    </div>
  );
}
