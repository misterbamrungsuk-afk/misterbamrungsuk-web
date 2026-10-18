import { notFound } from "next/navigation";
import { personById } from "@/lib/home/people";
import { getLiveApplicants, getLivePeople, photoPaths, publicId } from "@/lib/home/live";
import { reviewsFor } from "@/lib/bookings/day";
import { myBlocked } from "@/lib/customer/profile";
import { openPost } from "@/lib/interests";
import { fileVer } from "@/lib/thumb";
import { ProfileView } from "./view";

export const dynamic = "force-dynamic";

// โปรไฟล์ตัวอย่าง (mockup) แสดงได้เฉพาะตอนยังไม่มี Part-Time จริงเปิดแสดง — มีคนจริงแล้วตัวอย่างต้องหายทุกหน้า
// ?ex=1 = เปิดจากหน้าตัวอย่าง (/join/showcase) — ดูโปรไฟล์ตัวอย่างได้เสมอ
async function find(id: string, ex = false) {
  const live = await getLivePeople().catch(() => []);
  if (/^r[0-9a-f]{10}$/.test(id)) return live.find((x) => x.id === id);
  return live.length && !ex ? undefined : personById(id);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await find((await params).id);
  return { title: p ? `${p.nick} — Mister Bamrungsuk` : "Mister Bamrungsuk", robots: { index: false } };
}

// บอร์ด C-Profile "โปรไฟล์เพื่อน" — ตัวอย่าง (mockup) หรือ Part-Time จริงที่แอดมินเปิดแสดง (id ขึ้นต้น r)
// Part-Time จริง: รูปใส่รุ่น (&v=) ให้แคชยาว · ประกาศ "วันนี้ว่าง" + ปุ่มสนใจ (ไม่แสดงถ้าลูกค้าบล็อกคนนี้ไว้)
export default async function PersonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ex?: string }> }) {
  const p = await find((await params).id, (await searchParams).ex === "1");
  if (!p) notFound();
  const a = p.real ? (await getLiveApplicants().catch(() => [])).find((x) => publicId(x.mb_code) === p.id) : null;
  const reviews = a ? (await reviewsFor(a.id).catch(() => [])).map((r) => ({ rating: r.rating, tags: r.tags, body: r.body, created_at: r.created_at })) : [];
  const vers = a ? photoPaths(a).slice(0, 9).map(fileVer) : [];
  const post = a ? openPost(a) : null;
  const blocked = post ? (await myBlocked().catch(() => new Set<string>())).has(p.id) : false;
  const free = post && !blocked ? { text: post.text, time: post.time, zone: post.zone } : null;
  return <ProfileView p={p} reviews={reviews} vers={vers} free={free} />;
}
