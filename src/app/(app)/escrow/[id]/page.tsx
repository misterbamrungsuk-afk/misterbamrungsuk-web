import { redirect } from "next/navigation";

// สถานะเงิน (บอร์ด C-Escrow) อยู่ในหน้ารายละเอียดการจอง
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/order/${(await params).id}`);
}
