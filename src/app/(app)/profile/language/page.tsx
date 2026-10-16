import { redirect } from "next/navigation";

// ไม่ใช้แล้ว: ไม่มีตัวสลับภาษา · ลูกค้าไม่ต้องยืนยันตัวตน
export default function Page() {
  redirect("/profile");
}
