import { redirect } from "next/navigation";

// ติดตามสด (บอร์ด C-Tracking) รอบนี้ใช้เช็กอินถึงจุดนัด แสดงในหน้ารายละเอียดการจอง
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/order/${(await params).id}`);
}
