import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { putFile, readFile } from "@/lib/join/store";

// รูปโปรไฟล์ของทุกบัญชี (ลูกค้า / พาร์ทเนอร์ / ร้านค้า / Recruit) — ไฟล์ส่วนตัวใน bucket applicants · ตำแหน่ง+ซูมเก็บในตาราง profile_avatars
export type AvatarOwner = "customer" | "partner" | "vendor" | "sales";
export type Avatar = { owner_type: AvatarOwner; owner_id: string; path: string; pos: string; zoom: number; updated_at: string };
export const AVATAR_OWNERS: AvatarOwner[] = ["customer", "partner", "vendor", "sales"];

const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
const g = globalThis as unknown as { __mbAvatars?: Map<string, Avatar> };
const demo = (g.__mbAvatars ??= new Map());
const key = (t: string, id: string) => `${t}:${id}`;

export const cleanPos = (v: unknown) => { const m = /^(\d{1,3}(?:\.\d+)?)% (\d{1,3}(?:\.\d+)?)%$/.exec(String(v ?? "")); return m && +m[1] <= 100 && +m[2] <= 100 ? `${Math.round(+m[1])}% ${Math.round(+m[2])}%` : "50% 50%"; };
export const cleanZoom = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.min(3, Math.max(1, Math.round(n * 100) / 100)) : 1; };

export async function getAvatar(t: AvatarOwner, id: string): Promise<Avatar | null> {
  if (isDemo) return demo.get(key(t, id)) ?? null;
  const { data, error } = await db().from("profile_avatars").select().eq("owner_type", t).eq("owner_id", id).maybeSingle();
  if (error) throw error;
  return data ? { ...(data as Avatar), zoom: Number(data.zoom) } : null;
}

/** อัปรูปใหม่ (ถ้ามี) และ/หรือ ปรับตำแหน่ง/ซูม */
export async function saveAvatar(t: AvatarOwner, id: string, opts: { file?: File | null; pos?: unknown; zoom?: unknown }): Promise<Avatar> {
  const cur = await getAvatar(t, id);
  let path = cur?.path ?? "";
  if (opts.file && opts.file.size) {
    if (!/^image\/(jpeg|png|webp)$/.test(opts.file.type) || opts.file.size > 5 * 1024 * 1024) throw new Error("รูปต้องเป็น JPG/PNG/WebP ไม่เกิน 5MB");
    path = `avatars/${t}/${id.replace(/[^\w-]/g, "_").slice(0, 60)}-${Date.now()}.${opts.file.type.split("/")[1].replace("jpeg", "jpg")}`;
    await putFile(path, opts.file);
  }
  if (!path) throw new Error("เลือกรูปก่อน");
  const row: Avatar = { owner_type: t, owner_id: id, path, pos: opts.pos !== undefined ? cleanPos(opts.pos) : opts.file ? "50% 50%" : cur?.pos ?? "50% 50%", zoom: opts.zoom !== undefined ? cleanZoom(opts.zoom) : opts.file ? 1 : cur?.zoom ?? 1, updated_at: new Date().toISOString() };
  if (isDemo) { demo.set(key(t, id), row); return row; }
  const { error } = await db().from("profile_avatars").upsert(row, { onConflict: "owner_type,owner_id" });
  if (error) throw error;
  return row;
}

export async function avatarFile(t: AvatarOwner, id: string) {
  const a = await getAvatar(t, id).catch(() => null);
  return a ? readFile(a.path) : null;
}

/** โลโก้สาธารณะของพาร์ทเนอร์ / ร้านค้า (ลูกค้า/Recruit ไม่เปิดสาธารณะ) */
export type Logo = { src: string; pos: string; zoom: number };
export async function publicLogo(t: "partner" | "vendor", id: string): Promise<Logo | null> {
  const a = await getAvatar(t, id).catch(() => null);
  return a ? { src: `/api/public/avatar?t=${t}&id=${encodeURIComponent(id)}&v=${Date.parse(a.updated_at)}`, pos: a.pos, zoom: a.zoom } : null;
}
