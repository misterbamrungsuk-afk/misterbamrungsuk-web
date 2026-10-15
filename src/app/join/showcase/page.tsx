import { Showcase } from "./showcase";

export const metadata = { title: "ตัวอย่างแอปที่ลูกค้าเห็น — Mister Bamrungsuk" };

// หน้าแรกของแอปลูกค้า (ตามบอร์ด Benefits) สำหรับผู้สมัครดูว่าโปรไฟล์จะไปอยู่ตรงไหน — ข้อมูลตัวอย่าง ไม่มีการจองจริง
export default function ShowcasePage() {
  return <Showcase />;
}
