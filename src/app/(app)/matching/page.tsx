import { redirect } from "next/navigation";

// หน้าจับคู่เดิม → เรียกด่วน (บอร์ด C-QuickCall)
export default function Page() {
  redirect("/quick");
}
