import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasContact } from "@/lib/join/contact-guard";
import { notify } from "@/lib/bookings";

// โพสต์หาเพื่อนของลูกค้า (supabase/booking/0001_booking.sql: customer_posts / post_interests)
export type Post = { id: string; customer_id: string; activity: string; starts_at: string; hours: 3 | 5; area: string; note: string | null; status: "open" | "closed"; expires_at: string; created_at: string };
export type Interest = { post_id: string; parttime_id: string; parttime_mb: string; message: string | null; created_at: string };
export class PostError extends Error {}

const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
type Demo = { posts: Post[]; interests: Interest[] };
const g = globalThis as unknown as { __mbPosts?: Demo };
const demo: Demo = (g.__mbPosts ??= { posts: [], interests: [] } as Demo);
export const ACTIVITIES = ["กิน & เที่ยว", "คาเฟ่", "ดูหนัง", "ช่างภาพ", "ออกกำลัง", "นวดผ่อนคลาย"];
const isOpen = (p: Post) => p.status === "open" && Date.parse(p.expires_at) > Date.now();

export async function createPost(customer_id: string, p: { activity: string; starts_at: string; hours: number; area: string; note: string }): Promise<Post> {
  if (!ACTIVITIES.includes(p.activity)) throw new PostError("เลือกสิ่งที่อยากทำ");
  const start = Date.parse(p.starts_at);
  if (!Number.isFinite(start) || start < Date.now() + 60 * 60_000 || start > Date.now() + 30 * 86400_000) throw new PostError("เลือกวันเวลาล่วงหน้าอย่างน้อย 1 ชม.");
  const area = p.area.trim().slice(0, 80);
  if (area.length < 2) throw new PostError("บอกย่าน/สถานที่");
  if (hasContact(`${area} ${p.note}`)) throw new PostError("ห้ามใส่เบอร์โทร LINE หรือช่องทางติดต่อในโพสต์");
  const mine = (await listMine(customer_id)).filter(isOpen);
  if (mine.length >= 3) throw new PostError("เปิดโพสต์ได้พร้อมกันไม่เกิน 3 โพสต์");
  const row = { customer_id, activity: p.activity, starts_at: new Date(start).toISOString(), hours: (p.hours === 5 ? 5 : 3) as 3 | 5, area, note: p.note.trim().slice(0, 200) || null, status: "open" as const, expires_at: new Date(Date.now() + 24 * 3600_000).toISOString() };
  if (isDemo) { const r: Post = { ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() }; demo.posts.unshift(r); return r; }
  const { data, error } = await db().from("customer_posts").insert(row).select().single();
  if (error) throw error;
  return data as Post;
}
export async function listMine(customer_id: string): Promise<Post[]> {
  if (isDemo) return demo.posts.filter((p) => p.customer_id === customer_id);
  const { data, error } = await db().from("customer_posts").select().eq("customer_id", customer_id).order("created_at", { ascending: false }).limit(30);
  if (error) throw error;
  return (data ?? []) as Post[];
}
export async function listOpen(): Promise<Post[]> {
  if (isDemo) return demo.posts.filter(isOpen);
  const { data, error } = await db().from("customer_posts").select().eq("status", "open").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []) as Post[];
}
export async function interestsFor(post_ids: string[]): Promise<Interest[]> {
  if (!post_ids.length) return [];
  if (isDemo) return demo.interests.filter((i) => post_ids.includes(i.post_id));
  const { data, error } = await db().from("post_interests").select().in("post_id", post_ids);
  if (error) throw error;
  return (data ?? []) as Interest[];
}
export async function closePost(id: string, customer_id: string) {
  if (isDemo) { const p = demo.posts.find((x) => x.id === id && x.customer_id === customer_id); if (!p) throw new PostError("ไม่พบโพสต์"); p.status = "closed"; return p; }
  const { data, error } = await db().from("customer_posts").update({ status: "closed" }).eq("id", id).eq("customer_id", customer_id).select().maybeSingle();
  if (error) throw error;
  if (!data) throw new PostError("ไม่พบโพสต์");
  return data as Post;
}
export async function addInterest(post_id: string, pt: { id: string; mb_code: string }, message: string) {
  const posts = isDemo ? demo.posts : (((await db().from("customer_posts").select().eq("id", post_id).limit(1)).data ?? []) as Post[]);
  const p = posts.find((x) => x.id === post_id);
  if (!p || !isOpen(p)) throw new PostError("โพสต์นี้ปิดแล้ว");
  const msg = message.trim().slice(0, 120);
  if (hasContact(msg)) throw new PostError("ห้ามใส่เบอร์โทร LINE หรือช่องทางติดต่อ");
  const row: Interest = { post_id, parttime_id: pt.id, parttime_mb: pt.mb_code, message: msg || null, created_at: new Date().toISOString() };
  if (isDemo) { if (!demo.interests.some((i) => i.post_id === post_id && i.parttime_id === pt.id)) demo.interests.push(row); }
  else { const { error } = await db().from("post_interests").upsert(row, { onConflict: "post_id,parttime_id" }); if (error) throw error; }
  await notify({ user_type: "customer", user_id: p.customer_id, kind: "post_interest", title: "มีเพื่อนสนใจโพสต์ของคุณ", body: `${p.activity} · ${p.area}`, url: `/jobs/interested?id=${p.id}` });
}
