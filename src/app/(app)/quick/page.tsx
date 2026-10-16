import { redirect } from "next/navigation";

// เมนู "เรียกด่วน" (บอร์ด C-QuickCall) — ระหว่างทำหน้าใหม่ ใช้หน้าจับคู่เดิม
export default function QuickPage() {
  redirect("/matching");
}
