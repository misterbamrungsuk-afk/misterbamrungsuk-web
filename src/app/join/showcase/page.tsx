import { redirect } from "next/navigation";

// หน้าแรก (/) คือบอร์ด Benefits แล้ว — เส้นทางเดิมพาไปที่นั่น
export default function ShowcasePage() {
  redirect("/");
}
