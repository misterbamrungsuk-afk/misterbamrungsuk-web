import "server-only";
import { createHash } from "node:crypto";

// รูปย่อสำหรับการ์ด/หมุดแผนที่ (ลดขนาดรูปที่ส่งออก) — ?w= รับเฉพาะ 240 / 480 / 960
// ย่อด้วย sharp (ติดมากับ Next.js เป็น optional dependency) · โหลดไม่ได้ = ส่งรูปเดิม (ไม่ทำให้รูปหาย)
export const THUMB_WIDTHS = [240, 480, 960] as const;
export type ThumbWidth = (typeof THUMB_WIDTHS)[number];

/** ไม่ส่ง w = null (รูปเต็ม) · ส่งค่าที่ไม่รองรับ = "bad" (ตอบ 400) */
export function parseWidth(v: string | null): ThumbWidth | null | "bad" {
  if (v === null || v === "") return null;
  const n = Number(v);
  return (THUMB_WIDTHS as readonly number[]).includes(n) ? (n as ThumbWidth) : "bad";
}

/** รุ่นของไฟล์ (ใส่ใน URL เป็น &v=) — path เปลี่ยน = URL เปลี่ยน → แคชยาวได้ */
export const fileVer = (path: string) => createHash("sha256").update(path).digest("hex").slice(0, 8);

// path ที่ใส่รุ่นแล้ว (เนื้อไฟล์ไม่เปลี่ยนตาม URL) → แคชยาว · ไม่ระบุรุ่น → แคชสั้น (เจ้าของเปลี่ยนรูปแล้วเห็นเร็ว)
export const CACHE_LONG = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";
export const CACHE_SHORT = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

type Sharp = (typeof import("sharp"))["default"];
const g = globalThis as unknown as { __mbSharp?: Promise<Sharp | null>; __mbThumbs?: Map<string, { type: string; data: Buffer }> };
const loadSharp = () => (g.__mbSharp ??= import("sharp").then((m) => (m.default ?? (m as unknown as Sharp))).catch((e) => { console.warn("[thumb] sharp unavailable — serving originals:", (e as Error).message); return null; }));
const cache = (g.__mbThumbs ??= new Map());
const MAX_CACHE = 300;

/** ย่อรูปให้กว้างไม่เกิน w (ไม่ขยายรูปเล็ก) → WebP · ย่อไม่ได้ = คืนรูปเดิม */
export async function thumb(key: string, f: { type: string; data: Buffer }, w: ThumbWidth | null): Promise<{ type: string; data: Buffer }> {
  if (!w || !f.type.startsWith("image/")) return f;
  const k = `${key}|${w}|${f.data.length}`;
  const hit = cache.get(k);
  if (hit) { cache.delete(k); cache.set(k, hit); return hit; }
  const sharp = await loadSharp();
  if (!sharp) return f;
  try {
    const data = await sharp(f.data, { failOn: "error" }).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 74 }).toBuffer();
    const out = data.length < f.data.length ? { type: "image/webp", data } : f;
    cache.set(k, out);
    if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!);
    return out;
  } catch (e) {
    console.warn("[thumb] resize failed:", (e as Error).message);
    return f;
  }
}
