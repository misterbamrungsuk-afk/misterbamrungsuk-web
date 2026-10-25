import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Noto_Serif_Thai } from "next/font/google";
import { ADMIN_COOKIE, canAccess, homeFor, verifySession } from "@/lib/admin-auth";
import { AdminNav, DeniedBanner } from "./admin-nav";

// หัวข้อหลังบ้านธีมสว่าง (canvas "Admin Light Theme") ใช้ฟอนต์มีเชิง — โหลดเฉพาะหน้าแอดมิน
const serif = Noto_Serif_Thai({ subsets: ["thai", "latin"], weight: ["600", "700"], variable: "--font-noto-serif" });

export const metadata = { title: "แอดมิน — Mister Bamrungsuk" };
export const dynamic = "force-dynamic";

// หลังบ้านแอดมิน: อยู่นอก (app) จึงไม่ถูกบีบในกรอบมือถือ 480px และไม่มีแถบเมนูลูกค้า
// ตรวจ session ซ้ำที่นี่อีกชั้น (กันกรณี middleware ถูกข้าม)
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!session) redirect("/admin-login");
  // สิทธิ์ตามบทบาทอีกชั้น (ไม่พึ่ง middleware อย่างเดียว) — ไม่รู้ path = ถือว่าไม่มีสิทธิ์
  const path = (await headers()).get("x-admin-path");
  if (!path || !canAccess(session.role, path)) redirect(`${homeFor(session.role)}?denied=1`);

  return (
    <div className={`admin-light ${serif.variable} min-h-dvh lg:flex overflow-x-clip`}>
      <AdminNav email={session.email} role={session.role} />
      <main className="flex-1 min-w-0 px-4 lg:px-7 py-5 lg:py-7 pb-16 [&_.grid>*]:min-w-0">
        <Suspense><DeniedBanner /></Suspense>
        {children}
      </main>
    </div>
  );
}
