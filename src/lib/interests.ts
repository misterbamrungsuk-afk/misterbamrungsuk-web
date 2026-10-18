import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { extraOf, type Applicant, type PtPost } from "@/lib/join/store";
import { publicId } from "@/lib/home/live";
import { getProfile } from "@/lib/customer/profile";
import { notify } from "@/lib/bookings";

// ลูกค้ากด "สนใจ" ประกาศ "วันนี้ว่าง" ของ Part-Time (supabase/join/0008_post_interests.sql)
// ประกาศ = ใบเดียวต่อ Part-Time (docs.extra.post) · กุญแจประกาศ = created_at (ลงประกาศใหม่ = นับใหม่)
// ลูกค้าไม่ได้อะไรกลับนอกจากสถานะ "สนใจแล้ว" · Part-Time เห็นจำนวน + ชื่อแบบปิดบัง + ได้แจ้งเตือน
export type PtInterest = { id: string; parttime_id: string; post_at: string; customer_id: string; customer_label: string; withdrawn_at: string | null; created_at: string };
export class InterestError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

const envDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const g = globalThis as unknown as { __mbPtInterests?: PtInterest[]; __mbPtInterestsMissing?: boolean };
const demo = (g.__mbPtInterests ??= []);
const isDemo = () => envDemo || !!g.__mbPtInterestsMissing;
let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
function missing(err: { code?: string; message?: string } | null) {
  if (err && (err.code === "PGRST205" || err.code === "42P01" || /could not find the table|does not exist/i.test(err.message ?? ""))) {
    if (!g.__mbPtInterestsMissing) console.warn("[interests] pt_post_interests missing — run supabase/join/0008_post_interests.sql; using in-memory store");
    g.__mbPtInterestsMissing = true;
    return true;
  }
  return false;
}

/** ประกาศ "วันนี้ว่าง" ที่เปิดอยู่ของ Part-Time (ไม่มี = null) */
export const openPost = (a: Applicant): PtPost | null => { const p = extraOf(a).post; return p?.open && p.created_at ? p : null; };

/** ชื่อแรกแบบปิดบัง: "สมชาย ใจดี" → "สม***" */
export function maskName(name: string) {
  const first = (name || "").trim().split(/\s+/)[0] ?? "";
  const ch = Array.from(first);
  if (!ch.length) return "ลูกค้า";
  return ch.slice(0, ch.length > 2 ? 2 : 1).join("") + "***";
}

async function rowsFor(parttime_id: string, post_at: string): Promise<PtInterest[]> {
  const at = Date.parse(post_at);
  if (isDemo()) return demo.filter((r) => r.parttime_id === parttime_id && Date.parse(r.post_at) === at);
  const { data, error } = await db().from("pt_post_interests").select("*").eq("parttime_id", parttime_id).eq("post_at", new Date(at).toISOString()).order("created_at", { ascending: false }).limit(200);
  if (missing(error)) return rowsFor(parttime_id, post_at);
  if (error) throw new Error(error.message);
  return (data ?? []) as PtInterest[];
}

/** ลูกค้าคนนี้กดสนใจประกาศปัจจุบันของ Part-Time คนนี้อยู่ไหม */
export async function isInterested(a: Applicant, customer_id: string) {
  const p = openPost(a);
  if (!p) return false;
  return (await rowsFor(a.id, p.created_at)).some((r) => r.customer_id === customer_id && !r.withdrawn_at);
}

/** กดสนใจ / ยกเลิก — ซ้ำได้ไม่เพิ่มแถว · ลูกค้าที่บล็อก Part-Time คนนี้กดไม่ได้ · แจ้ง Part-Time เฉพาะครั้งแรกของลูกค้าคนนั้นต่อประกาศ */
export async function setInterest(a: Applicant, me: { sub: string; email: string }, on: boolean): Promise<{ interested: boolean; already: boolean }> {
  const p = openPost(a);
  if (!p) throw new InterestError("ประกาศนี้ปิดแล้ว", 404);
  const prof = await getProfile(me.sub, me.email).catch(() => null);
  if (prof?.blocked?.includes(publicId(a.mb_code))) throw new InterestError("ไม่พบประกาศ", 404);
  const rows = await rowsFor(a.id, p.created_at);
  const cur = rows.find((r) => r.customer_id === me.sub);
  const now = new Date().toISOString();
  if (!on) {
    if (!cur || cur.withdrawn_at) return { interested: false, already: true };
    if (isDemo()) cur.withdrawn_at = now;
    else { const { error } = await db().from("pt_post_interests").update({ withdrawn_at: now }).eq("id", cur.id); if (error) throw new Error(error.message); }
    return { interested: false, already: false };
  }
  if (cur && !cur.withdrawn_at) return { interested: true, already: true };
  if (cur) {
    if (isDemo()) cur.withdrawn_at = null;
    else { const { error } = await db().from("pt_post_interests").update({ withdrawn_at: null }).eq("id", cur.id); if (error) throw new Error(error.message); }
    return { interested: true, already: false };
  }
  const row = { parttime_id: a.id, post_at: new Date(Date.parse(p.created_at)).toISOString(), customer_id: me.sub, customer_label: maskName(prof?.name || me.email.split("@")[0]), withdrawn_at: null };
  if (isDemo()) demo.push({ ...row, id: crypto.randomUUID(), created_at: now });
  else {
    const { error } = await db().from("pt_post_interests").insert(row);
    if (error && missing(error)) return setInterest(a, me, on);
    // กดพร้อมกัน 2 ครั้ง → unique ชน = ถือว่าสนใจแล้ว (ไม่แจ้งซ้ำ)
    if (error?.code === "23505") return { interested: true, already: true };
    if (error) throw new Error(error.message);
  }
  await notify({ user_type: "parttime", user_id: a.id, kind: "post_interest_pt", title: "มีลูกค้าสนใจประกาศวันนี้ว่าง", body: `${row.customer_label} สนใจ "${p.text.slice(0, 40)}"`, url: `/join/profile/${a.mb_code}/posts` }).catch(() => {});
  return { interested: true, already: false };
}

/** คนที่สนใจประกาศปัจจุบัน (สำหรับ Part-Time) — ชื่อปิดบัง · ตัดคนที่ถอนแล้ว และลูกค้าที่บล็อก Part-Time คนนี้ภายหลัง */
export async function interestsForPt(a: Applicant): Promise<{ count: number; list: { label: string; at: string }[] }> {
  const p = openPost(a);
  if (!p) return { count: 0, list: [] };
  const pid = publicId(a.mb_code);
  const live = (await rowsFor(a.id, p.created_at)).filter((r) => !r.withdrawn_at);
  const ok = await Promise.all(live.map(async (r) => !((await getProfile(r.customer_id, "").catch(() => null))?.blocked ?? []).includes(pid)));
  const list = live.filter((_, i) => ok[i]).sort((x, y) => y.created_at.localeCompare(x.created_at)).map((r) => ({ label: r.customer_label, at: r.created_at }));
  return { count: list.length, list };
}
