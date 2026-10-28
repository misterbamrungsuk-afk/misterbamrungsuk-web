import { Noto_Serif_Thai } from "next/font/google";

const serif = Noto_Serif_Thai({ subsets: ["thai", "latin"], weight: ["600", "700"], variable: "--font-noto-serif" });

export const metadata = { title: "ห้อง CEO — Mister Bamrungsuk", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// ห้อง CEO แยกลิงก์ (รหัสแยกจากแอดมิน) — ใช้ธีมสว่างเดียวกับหลังบ้าน แต่ไม่มีเมนูแอดมิน
export default function CeoLayout({ children }: { children: React.ReactNode }) {
  return <div className={`admin-light ${serif.variable} min-h-dvh overflow-x-clip`}><main className="max-w-[1280px] mx-auto px-4 lg:px-7 py-5 lg:py-7 pb-16 [&_.grid>*]:min-w-0">{children}</main></div>;
}
