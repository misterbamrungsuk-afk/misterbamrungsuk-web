import { redirect } from "next/navigation";

// โหมด Part-Time เดิมเลิกใช้ → Part-Time ใช้หน้าโปรไฟล์ของตัวเอง (/join/profile/[mb]) · คนทั่วไปไปหน้าร่วมงานกับเรา
export default function Page() {
  redirect("/work-with-us");
}
