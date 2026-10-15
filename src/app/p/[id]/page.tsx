import { notFound } from "next/navigation";
import { personById } from "@/lib/home/people";
import { getLivePeople } from "@/lib/home/live";
import { ProfileView } from "./view";

export const dynamic = "force-dynamic";

async function find(id: string) {
  return personById(id) ?? (/^r[0-9a-f]{10}$/.test(id) ? (await getLivePeople()).find((x) => x.id === id) : undefined);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await find((await params).id);
  return { title: p ? `${p.nick} — Mister Bamrungsuk` : "Mister Bamrungsuk", robots: { index: false } };
}

// บอร์ด C-Profile "โปรไฟล์เพื่อน" — ตัวอย่าง (mockup) หรือ Part-Time จริงที่แอดมินเปิดแสดง (id ขึ้นต้น r)
export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await find((await params).id);
  if (!p) notFound();
  return <ProfileView p={p} />;
}
