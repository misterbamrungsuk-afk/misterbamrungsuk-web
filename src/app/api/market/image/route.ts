import { FILE_RE, readFile } from "@/lib/market/store";
import { fileHeaders } from "@/lib/file-guard";
import { CACHE_LONG, parseWidth, thumb } from "@/lib/thumb";

export const runtime = "nodejs";

// รูปสินค้า (สาธารณะ) — เสิร์ฟเฉพาะโฟลเดอร์ products/ และ banners/ (สลิปดูได้ทางแอดมินเท่านั้น)
// ชื่อไฟล์มีเวลาอัปโหลด (เปลี่ยนรูป = path ใหม่) → แคชยาวได้ · ?w=240|480|960 = รูปย่อสำหรับตารางสินค้า
export async function GET(req: Request) {
  const u = new URL(req.url);
  const p = u.searchParams.get("p") ?? "";
  const w = parseWidth(u.searchParams.get("w"));
  if (w === "bad") return new Response("bad width (240, 480, 960)", { status: 400 });
  if (!FILE_RE.test(p) || !(p.startsWith("products/") || p.startsWith("banners/"))) return new Response("not found", { status: 404 });
  const f = await readFile(p);
  if (!f) return new Response("not found", { status: 404 });
  const out = await thumb(`market:${p}`, f, w);
  return new Response(new Uint8Array(out.data), { headers: fileHeaders(out.type, CACHE_LONG) });
}
