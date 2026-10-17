// ตรวจไฟล์จาก "เนื้อไฟล์จริง" (magic bytes) แทนการเชื่อชนิดไฟล์ที่เบราว์เซอร์บอก (ปลอมได้)
// + header สำหรับเสิร์ฟไฟล์ที่ผู้ใช้อัป: ห้ามเดาชนิด · ห้ามรันสคริปต์ · PDF ให้ดาวน์โหลดแทนเปิดในเว็บเรา
export type SafeType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
export const EXT_OF: Record<SafeType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export function sniff(b: Uint8Array): SafeType | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "application/pdf";
  return null;
}

export class FileTypeError extends Error {}

/** ชนิดไฟล์จริง — ต้องอยู่ในรายการที่อนุญาต ไม่งั้น throw FileTypeError */
export function verifiedType(data: Uint8Array, allow: SafeType[] = ["image/jpeg", "image/png", "image/webp"]): SafeType {
  const t = sniff(data);
  if (!t || !allow.includes(t)) throw new FileTypeError(allow.includes("application/pdf") ? "ไฟล์ต้องเป็นรูป JPG/PNG/WebP หรือ PDF จริง" : "ไฟล์ต้องเป็นรูป JPG/PNG/WebP จริง");
  return t;
}

/** header ตอนเสิร์ฟไฟล์ที่ผู้ใช้อัป */
export function fileHeaders(type: string, cache = "private, no-store"): Record<string, string> {
  const t = (["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(type) ? type : "application/octet-stream");
  const pdf = t === "application/pdf";
  return {
    "Content-Type": t,
    "Cache-Control": cache,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    "Content-Disposition": `${pdf || t === "application/octet-stream" ? "attachment" : "inline"}; filename="file.${pdf ? "pdf" : t.split("/")[1] ?? "bin"}"`,
    "Cross-Origin-Resource-Policy": "same-origin",
  };
}
