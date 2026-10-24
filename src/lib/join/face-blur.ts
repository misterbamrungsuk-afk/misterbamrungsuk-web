import "server-only";
import { createHash } from "node:crypto";

// เบลอหน้า Part-Time ที่ "ไม่สามารถเปิดเผยข้อมูล" (บอสสั่ง 24 ต.ค. 2569)
// เบลอที่เซิร์ฟเวอร์ก่อนส่งรูปสาธารณะ (/api/public/pt-photo) — รูปต้นฉบับไม่ออกไปถึงลูกค้า · เบลอไม่ได้ = ไม่ส่งรูป
// จุดเบลอ (วงกลม) ตั้งเองต่อรูปในหน้า "รูปโปรไฟล์": x,y = จุดกึ่งกลาง (% ของกว้าง/สูง) · r = รัศมี (% ของความกว้าง)
export type FaceBox = { x: number; y: number; r: number };
export const DEFAULT_BOX: FaceBox = { x: 50, y: 28, r: 24 };
type Ext = { disclose?: "yes" | "no" | null; face_blur?: Record<string, FaceBox> | null };

export const blurOn = (x: Ext) => x.disclose === "no";
export const boxFor = (x: Ext, path: string): FaceBox => x.face_blur?.[path] ?? DEFAULT_BOX;
export function cleanBox(v: unknown): FaceBox | null {
  const b = (v ?? {}) as Record<string, unknown>;
  const n = (k: string, lo: number, hi: number) => { const x = Number(b[k]); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x * 10) / 10)) : null; };
  const x = n("x", 0, 100), y = n("y", 0, 100), r = n("r", 8, 60);
  return x === null || y === null || r === null ? null : { x, y, r };
}
/** รุ่นของรูปสาธารณะ: path + การตั้งค่าเบลอ (เปลี่ยนจุดเบลอ/เปิดปิดเบลอ = URL ใหม่ → แคชเก่าไม่ค้าง) */
export const pubVer = (path: string, x: Ext) => createHash("sha256").update(path + (blurOn(x) ? JSON.stringify(boxFor(x, path)) : "")).digest("hex").slice(0, 8);

type Sharp = (typeof import("sharp"))["default"];
const g = globalThis as unknown as { __mbSharpBlur?: Promise<Sharp> };
const loadSharp = () => (g.__mbSharpBlur ??= import("sharp").then((m) => (m.default ?? (m as unknown as Sharp))));

/** คืนรูปที่เบลอวงกลมตาม box (JPEG) — โยน error ถ้าทำไม่ได้ (ผู้เรียกต้องไม่ส่งรูปเดิมแทน) */
export async function blurFace(data: Buffer, box: FaceBox): Promise<{ type: string; data: Buffer }> {
  const sharp = await loadSharp();
  const base = await sharp(data, { failOn: "error" }).rotate().jpeg({ quality: 90 }).toBuffer();
  const { width = 0, height = 0 } = await sharp(base).metadata();
  if (!width || !height) throw new Error("bad image");
  const cx = Math.round((box.x / 100) * width), cy = Math.round((box.y / 100) * height), r = Math.round((box.r / 100) * width);
  const sigma = Math.max(12, Math.round(width / 28));
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><radialGradient id="g"><stop offset="78%" stop-color="#fff"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${Math.round(r * 1.2)}" fill="url(#g)"/></svg>`);
  const blurred = await sharp(base).blur(sigma).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const out = await sharp(base).composite([{ input: blurred }]).jpeg({ quality: 86 }).toBuffer();
  return { type: "image/jpeg", data: out };
}
