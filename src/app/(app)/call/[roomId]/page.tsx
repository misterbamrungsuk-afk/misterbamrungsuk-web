import { redirect } from "next/navigation";

// โทรซ่อนเบอร์ยังไม่อยู่ในรอบนี้ (บอร์ด C-Call) → คุยในแชท
export default async function Page({ params }: { params: Promise<{ roomId: string }> }) {
  redirect(`/chat/${(await params).roomId}`);
}
