import { redirect } from "next/navigation";

// หน้าแรกเดิมของแอป → หน้าแรกใหม่ (บอร์ด C-Home)
export default function Page() {
  redirect("/");
}
