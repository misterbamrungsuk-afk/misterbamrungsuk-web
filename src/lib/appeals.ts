import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { listStrikes, type ProviderStrike } from "@/lib/noshow";
import { STRIKE_EXPIRE_DAYS } from "@/lib/strikes";
import { putFile, type Applicant } from "@/lib/join/store";
import { notify } from "@/lib/bookings";
import { store } from "@/lib/server-store";

// อุทธรณ์ใบเตือน (strike) ในแอป — 1 อุทธรณ์ ต่อ 1 ใบ (supabase/join/0009_strike_appeals.sql)
// รับอุทธรณ์ (accepted) = ยกเลิกใบเตือนนั้น: การนับใบเตือนต้องกรอง strike_id ใน voidedStrikeIds() ออก
// รูปหลักฐาน (ไม่บังคับ) ตรวจชนิดจากเนื้อไฟล์ (file-guard ผ่าน putFile) · เก็บใน bucket applicants (private)
export type AppealStatus = "pending" | "accepted" | "rejected";
export type Appeal = {
  id: string; strike_id: string; parttime_id: string; mb: string;
  strike_reason: string; strike_ref: string | null; strike_at: string | null;
  reason: string; photo_path: string | null; status: AppealStatus;
  decision_note: string | null; decided_by: string | null; decided_at: string | null; created_at: string;
};
export class AppealError extends Error { constructor(msg: string, public status = 400) { super(msg); } }
export const APPEAL_MAX = 1000;
const PHOTO_MAX = 8 * 1024 * 1024;

const envDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const g = globalThis as unknown as { __mbAppeals?: Appeal[]; __mbAppealsMissing?: boolean };
const demo = (g.__mbAppeals ??= []);
const isDemo = () => envDemo || !!g.__mbAppealsMissing;
let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
function missing(err: { code?: string; message?: string } | null) {
  if (err && (err.code === "PGRST205" || err.code === "42P01" || /could not find the table|does not exist/i.test(err.message ?? ""))) {
    if (!g.__mbAppealsMissing) console.warn("[appeals] strike_appeals missing — run supabase/join/0009_strike_appeals.sql; using in-memory store");
    g.__mbAppealsMissing = true;
    return true;
  }
  return false;
}

export async function listAppeals(f: { parttime_id?: string; status?: AppealStatus } = {}): Promise<Appeal[]> {
  if (isDemo()) return demo.filter((a) => (!f.parttime_id || a.parttime_id === f.parttime_id) && (!f.status || a.status === f.status)).sort((a, b) => b.created_at.localeCompare(a.created_at));
  let q = db().from("strike_appeals").select("*").order("created_at", { ascending: false }).limit(500);
  if (f.parttime_id) q = q.eq("parttime_id", f.parttime_id);
  if (f.status) q = q.eq("status", f.status);
  const { data, error } = await q;
  if (missing(error)) return listAppeals(f);
  if (error) throw new Error(error.message);
  return (data ?? []) as Appeal[];
}

export async function getAppeal(id: string): Promise<Appeal | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  if (isDemo()) return demo.find((a) => a.id === id) ?? null;
  const { data, error } = await db().from("strike_appeals").select("*").eq("id", id).maybeSingle();
  if (missing(error)) return getAppeal(id);
  if (error) throw new Error(error.message);
  return (data as Appeal) ?? null;
}

/** strike_id ที่อุทธรณ์ผ่านแล้ว (ใบเตือนถูกยกเลิก) — ใช้กรองตอนนับใบเตือน */
export async function voidedStrikeIds(parttime_id?: string): Promise<Set<string>> {
  return new Set((await listAppeals({ parttime_id, status: "accepted" }).catch(() => [])).map((a) => a.strike_id));
}

/** ใบเตือนที่ยังมีผลของ Part-Time (ไม่หมดอายุ · ไม่ถูกยกเลิกจากอุทธรณ์) + อุทธรณ์ของแต่ละใบ */
export async function strikesWithAppeals(parttime_id: string) {
  const since = Date.now() - STRIKE_EXPIRE_DAYS * 86400_000;
  const [all, appeals] = await Promise.all([listStrikes(parttime_id).catch(() => [] as ProviderStrike[]), listAppeals({ parttime_id }).catch(() => [] as Appeal[])]);
  const by = new Map(appeals.map((a) => [a.strike_id, a]));
  const strikes = all.filter((s) => Date.parse(s.created_at) >= since).map((s) => ({ ...s, appeal: by.get(s.id) ?? null }));
  const active = strikes.filter((s) => s.appeal?.status !== "accepted");
  return { strikes, active, count: active.length, voided: strikes.length - active.length };
}

/** Part-Time ยื่นอุทธรณ์ใบเตือนของตัวเอง — ใบละครั้ง · ใบที่หมดอายุแล้วอุทธรณ์ไม่ได้ */
export async function submitAppeal(a: Applicant, strike_id: string, reason: string, photo: File | null): Promise<Appeal> {
  const text = reason.trim();
  if (!text) throw new AppealError("บอกเหตุผลที่ขออุทธรณ์");
  if (text.length > APPEAL_MAX) throw new AppealError(`เหตุผลยาวได้ไม่เกิน ${APPEAL_MAX} ตัวอักษร`);
  const { strikes } = await strikesWithAppeals(a.id);
  const s = strikes.find((x) => x.id === strike_id);
  if (!s) throw new AppealError("ไม่พบใบเตือนนี้", 404);
  if (s.appeal) throw new AppealError("ใบเตือนนี้ยื่นอุทธรณ์ไปแล้ว", 409);
  let photo_path: string | null = null;
  if (photo && photo.size) {
    if (photo.size > PHOTO_MAX) throw new AppealError("รูปใหญ่เกิน 8 MB");
    const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    photo_path = `appeals/${a.id}/${strike_id.replace(/[^\w-]/g, "").slice(0, 40)}-${Date.now()}.${ext}`;
    await putFile(photo_path, photo); // FileTypeError = ไม่ใช่รูปจริง
  }
  const row = {
    strike_id, parttime_id: a.id, mb: a.mb_code, strike_reason: s.reason, strike_ref: s.ref, strike_at: s.created_at,
    reason: text, photo_path, status: "pending" as const, decision_note: null, decided_by: null, decided_at: null,
  };
  let out: Appeal;
  if (isDemo()) { out = { ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() }; demo.push(out); }
  else {
    const { data, error } = await db().from("strike_appeals").insert(row).select("*").single();
    if (error && missing(error)) return submitAppeal(a, strike_id, reason, photo);
    if (error?.code === "23505") throw new AppealError("ใบเตือนนี้ยื่นอุทธรณ์ไปแล้ว", 409);
    if (error) throw new Error(error.message);
    out = data as Appeal;
  }
  await notify({ user_type: "admin", user_id: "ops", kind: "appeal", title: "มีคำอุทธรณ์ใบเตือนใหม่", body: `${a.mb_code} · ${s.ref ? `การจอง ${s.ref}` : s.reason}`, url: "/admin/appeals" }).catch(() => {});
  return out;
}

/** แอดมินตัดสิน: รับ = ยกเลิกใบเตือน · ไม่รับ = ต้องมีเหตุผล · ตัดสินได้ครั้งเดียว */
export async function decideAppeal(id: string, accept: boolean, admin: string, note: string): Promise<Appeal> {
  const ap = await getAppeal(id);
  if (!ap) throw new AppealError("ไม่พบคำอุทธรณ์", 404);
  if (ap.status !== "pending") throw new AppealError("คำอุทธรณ์นี้ตัดสินไปแล้ว", 409);
  const why = note.trim().slice(0, 300);
  if (!accept && !why) throw new AppealError("ใส่เหตุผลที่ไม่รับอุทธรณ์");
  const patch = { status: (accept ? "accepted" : "rejected") as AppealStatus, decision_note: why || null, decided_by: admin, decided_at: new Date().toISOString() };
  let out: Appeal;
  if (isDemo()) { Object.assign(ap, patch); out = ap; }
  else {
    const { data, error } = await db().from("strike_appeals").update(patch).eq("id", id).eq("status", "pending").select("*").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new AppealError("คำอุทธรณ์นี้ตัดสินไปแล้ว", 409);
    out = data as Appeal;
  }
  store().audit.unshift({ id: `a-${Date.now()}`, actor: admin, action: `appeal.${patch.status}`, entity: `Strike ${ap.strike_id} (${ap.mb})`, at: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) });
  await notify({
    user_type: "parttime", user_id: ap.parttime_id, kind: "appeal",
    title: accept ? "อุทธรณ์ผ่าน · ยกเลิกใบเตือนแล้ว" : "อุทธรณ์ไม่ผ่าน",
    body: accept ? `ใบเตือน${ap.strike_ref ? ` การจอง ${ap.strike_ref}` : ""} ไม่นับแล้ว` : why,
    url: `/join/profile/${ap.mb}/strikes`,
  }).catch(() => {});
  return out;
}
