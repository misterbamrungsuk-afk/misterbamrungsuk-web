import { redirect } from "next/navigation";

// ขั้นชำระเงินรวมอยู่ในหน้าจองแล้ว (บอร์ด C-Checkout เป็นขั้นที่ 3)
export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/book/${(await params).id}`);
}
