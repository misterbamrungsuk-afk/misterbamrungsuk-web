import { notFound } from "next/navigation";
import { personById } from "@/lib/home/people";
import { getLiveApplicants, getLivePeople, publicId } from "@/lib/home/live";
import { reviewsFor } from "@/lib/bookings/day";
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
  const a = p.real ? (await getLiveApplicants().catch(() => [])).find((x) => publicId(x.mb_code) === p.id) : null;
  const reviews = a ? (await reviewsFor(a.id).catch(() => [])).map((r) => ({ rating: r.rating, tags: r.tags, body: r.body, created_at: r.created_at })) : [];
  return <ProfileView p={p} reviews={reviews} />;
}
