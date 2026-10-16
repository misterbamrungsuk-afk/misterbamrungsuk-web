import { notFound } from "next/navigation";
import { personById } from "@/lib/home/people";
import { getLivePeople } from "@/lib/home/live";
import { ChatView } from "./view";

export const dynamic = "force-dynamic";

// ตัวอย่างเท่านั้น — มี Part-Time จริงเปิดแสดงแล้ว หน้าแชทตัวอย่างต้องหาย (แชทจริงอยู่ที่ /chat/[roomId] หลังจอง)
async function find(id: string) {
  const live = await getLivePeople().catch(() => []);
  return live.length ? undefined : personById(id);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await find((await params).id);
  return { title: p ? `แชทกับ${p.nick} — Mister Bamrungsuk` : "Mister Bamrungsuk", robots: { index: false } };
}

// บอร์ด C-ChatRoom "ห้องแชท" — ตัวอย่างหน้าแชท (ข้อความอยู่ในเครื่องเท่านั้น ไม่ส่งถึงใคร)
export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await find((await params).id);
  if (!p) notFound();
  return <ChatView p={p} />;
}
