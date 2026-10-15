import { notFound } from "next/navigation";
import { PEOPLE, personById } from "@/lib/home/people";
import { ChatView } from "./view";

export function generateStaticParams() {
  return PEOPLE.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = personById((await params).id);
  return { title: p ? `แชทกับ${p.nick} — Mister Bamrungsuk` : "Mister Bamrungsuk", robots: { index: false } };
}

// บอร์ด C-ChatRoom "ห้องแชท" — ตัวอย่างหน้าแชท (ข้อความอยู่ในเครื่องเท่านั้น ไม่ส่งถึงใคร)
export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const p = personById((await params).id);
  if (!p) notFound();
  return <ChatView p={p} />;
}
