import { notFound } from "next/navigation";
import { personById } from "@/lib/home/people";
import { getLiveApplicants, getLivePeople, photoPaths, publicId } from "@/lib/home/live";
import { reviewsFor } from "@/lib/bookings/day";
import { myBlocked } from "@/lib/customer/profile";
import { openPost } from "@/lib/interests";
import { pubVer } from "@/lib/join/face-blur";
import { extraOf } from "@/lib/join/store";
import { ProfileView } from "./view";
import { PT_ONLY } from "@/lib/site-gate";
import { getLang } from "@/i18n/server";
import { autoTranslate } from "@/lib/i18n/auto-translate";

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
  const p0 = await find((await params).id, (await searchParams).ex === "1");
  if (!p0) notFound();
  let p = p0;
  const a = p.real ? (await getLiveApplicants().catch(() => [])).find((x) => publicId(x.mb_code) === p.id) : null;
  let reviews = a ? (await reviewsFor(a.id).catch(() => [])).map((r) => ({ rating: r.rating, tags: r.tags, body: r.body, created_at: r.created_at })) : [];
  const vers = a ? photoPaths(a).slice(0, 9).map((path) => pubVer(path, extraOf(a))) : [];
  const post = a ? openPost(a) : null;
  const blocked = post ? (await myBlocked().catch(() => new Set<string>())).has(p.id) : false;
  let free = post && !blocked ? { text: post.text, time: post.time, zone: post.zone } : null;
  // EN / 中文: ข้อความที่ Part-Time/ลูกค้าพิมพ์เอง (ชื่อเล่น · แนะนำตัว · ประกาศ · รีวิว) แปลอัตโนมัติ (แคชไว้ · แปลไม่ได้ = ข้อความเดิม)
  const lang = await getLang();
  if (lang !== "th" && p.real) {
    const tr = await autoTranslate(lang, [
      { kind: "name", text: p.nick }, { kind: "text", text: p.bio },
      ...(free ? [{ kind: "text" as const, text: free.text }, { kind: "text" as const, text: free.zone }, { kind: "text" as const, text: free.time }] : []),
      ...reviews.flatMap((r) => [{ kind: "text" as const, text: r.body }, ...r.tags.map((t) => ({ kind: "text" as const, text: t }))]),
    ]);
    p = { ...p, nick: tr("name", p.nick), bio: tr("text", p.bio) };
    if (free) free = { text: tr("text", free.text), time: tr("text", free.time), zone: tr("text", free.zone) };
    reviews = reviews.map((r) => ({ ...r, body: r.body ? tr("text", r.body) : r.body, tags: r.tags.map((t) => tr("text", t)) }));
  }
  return <><ProfileView p={p} reviews={reviews} vers={vers} free={free} preview={PT_ONLY} /></>;
}
