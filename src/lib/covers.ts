import "server-only";
import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SLOTS, type CoverRow, type CoverSlot } from "./covers-config";

export { SLOTS, isSlot, type CoverSlot, type CoverRow } from "./covers-config";

// รูปหน้าปก: ตาราง site_covers + bucket public "covers" — ไม่มี env/ตาราง → ใช้รูป default
const BUCKET = "covers";
const hasEnv = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
let sb: SupabaseClient | null = null;
function db() {
  if (!sb) sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  return sb;
}
const publicUrl = (path: string) => db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

async function rows(slot?: CoverSlot): Promise<CoverRow[]> {
  if (!hasEnv()) return [];
  let q = db().from("site_covers").select("id, slot, position, path").order("position", { ascending: true }).order("created_at", { ascending: true });
  if (slot) q = q.eq("slot", slot);
  const { data, error } = await q;
  if (error || !data) return [];
  return (data as Omit<CoverRow, "url">[]).map((r) => ({ ...r, url: publicUrl(r.path) }));
}

/** URL รูปของช่อง (DB ก่อน ไม่มีก็ default) — ไม่ throw */
export async function getCovers(slot: CoverSlot): Promise<string[]> {
  try {
    const r = await rows(slot);
    return r.length ? r.map((x) => x.url) : SLOTS[slot].defaults;
  } catch {
    return SLOTS[slot].defaults;
  }
}

/** ใช้ได้กับ Supabase หรือไม่ (แสดงคำเตือนในหน้าแอดมิน) */
export const coversConfigured = hasEnv;

export const listAll = () => rows();

export async function addCover(slot: CoverSlot, file: Buffer, ext: string): Promise<CoverRow> {
  if (!hasEnv()) throw new Error("ยังไม่ได้ตั้งค่า Supabase");
  const cur = await rows(slot);
  if (cur.length >= SLOTS[slot].max) throw new Error(`ช่องนี้ใส่ได้สูงสุด ${SLOTS[slot].max} รูป`);
  const path = `${slot}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const up = await db().storage.from(BUCKET).upload(path, file, { contentType: type, upsert: false, cacheControl: "31536000" });
  if (up.error) throw new Error(up.error.message);
  const position = cur.length ? Math.max(...cur.map((r) => r.position)) + 1 : 0;
  const { data, error } = await db().from("site_covers").insert({ slot, position, path }).select("id, slot, position, path").single();
  if (error || !data) {
    await db().storage.from(BUCKET).remove([path]);
    throw new Error(error?.message || "insert failed");
  }
  return { ...(data as Omit<CoverRow, "url">), url: publicUrl(path) };
}

/** ช่องรูปเดียว: อัปรูปใหม่ก่อน แล้วค่อยลบของเก่า */
export async function replaceSingle(slot: CoverSlot, file: Buffer, ext: string): Promise<CoverRow> {
  if (!hasEnv()) throw new Error("ยังไม่ได้ตั้งค่า Supabase");
  const old = await rows(slot);
  const path = `${slot}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const up = await db().storage.from(BUCKET).upload(path, file, { contentType: type, upsert: false, cacheControl: "31536000" });
  if (up.error) throw new Error(up.error.message);
  const { data, error } = await db().from("site_covers").insert({ slot, position: 0, path }).select("id, slot, position, path").single();
  if (error || !data) {
    await db().storage.from(BUCKET).remove([path]);
    throw new Error(error?.message || "insert failed");
  }
  for (const r of old) await removeCover(r.id);
  return { ...(data as Omit<CoverRow, "url">), url: publicUrl(path) };
}

export async function removeCover(id: string) {
  if (!hasEnv()) throw new Error("ยังไม่ได้ตั้งค่า Supabase");
  const { data } = await db().from("site_covers").select("path").eq("id", id).maybeSingle();
  if (!data) return false;
  await db().from("site_covers").delete().eq("id", id);
  await db().storage.from(BUCKET).remove([(data as { path: string }).path]);
  return true;
}

export async function reorder(slot: CoverSlot, ids: string[]) {
  if (!hasEnv()) throw new Error("ยังไม่ได้ตั้งค่า Supabase");
  const cur = new Set((await rows(slot)).map((r) => r.id));
  const ok = ids.filter((id) => cur.has(id));
  await Promise.all(ok.map((id, i) => db().from("site_covers").update({ position: i }).eq("id", id).eq("slot", slot)));
}

/** อ่านขนาดภาพจาก header (JPEG/PNG/WebP) */
export function imageSize(b: Buffer): { w: number; h: number } | null {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.length > 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const t = b.toString("ascii", 12, 16);
    if (t === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (t === "VP8L") { const n = b.readUInt32LE(21); return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 }; }
    if (t === "VP8X") return { w: b.readUIntLE(24, 3) + 1, h: b.readUIntLE(27, 3) + 1 };
    return null;
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      if (m === 0xd8 || m === 0x01 || m === 0xff || (m >= 0xd0 && m <= 0xd7)) { i += m === 0xff ? 1 : 2; continue; }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}
