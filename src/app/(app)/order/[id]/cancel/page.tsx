import { redirect } from "next/navigation";

// รวมอยู่ในหน้ารายละเอียดการจองแล้ว
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/order/${(await params).id}`);
}
