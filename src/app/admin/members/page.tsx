import { redirect } from "next/navigation";

// หน้านี้เคยเป็นข้อมูลตัวอย่าง (โหมดเดโม) — รอบเปิดใช้จริงพาไปหน้าที่ใช้ข้อมูลจริงแทน
export default function Page() {
  redirect("/admin/applicants");
}
