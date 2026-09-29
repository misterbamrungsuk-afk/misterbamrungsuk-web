import { AdminNav } from "./admin-nav";

export const metadata = { title: "แอดมิน — MorD" };

// หลังบ้านแอดมิน: อยู่นอก (app) จึงไม่ถูกบีบในกรอบมือถือ 480px และไม่มีแถบเมนูลูกค้า
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:flex">
      <AdminNav />
      <main className="flex-1 min-w-0 px-4 lg:px-8 py-5 lg:py-7 pb-16 [&_.grid>*]:min-w-0">{children}</main>
    </div>
  );
}
