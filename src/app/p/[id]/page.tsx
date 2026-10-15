import { notFound } from "next/navigation";
import { PEOPLE, personById } from "@/lib/home/people";
import { ProfileView } from "./view";

export function generateStaticParams() {
  return PEOPLE.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = personById((await params).id);
  return { title: p ? `${p.nick} — Mister Bamrungsuk` : "Mister Bamrungsuk", robots: { index: false } };
}

// บอร์ด C-Profile "โปรไฟล์เพื่อน" — ตัวอย่าง (mockup) จากการ์ดหน้าแรก
export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const p = personById((await params).id);
  if (!p) notFound();
  return <ProfileView p={p} />;
}
