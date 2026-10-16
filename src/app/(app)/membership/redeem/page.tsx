import { redirect } from "next/navigation";

// ใช้โค้ดของขวัญ (บอร์ด C-Redeem) เปิดพร้อมระดับสมาชิก
export default function Page() {
  redirect("/membership");
}
