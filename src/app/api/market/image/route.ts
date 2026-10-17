import { FILE_RE, readFile } from "@/lib/market/store";
import { fileHeaders } from "@/lib/file-guard";

export const runtime = "nodejs";

// รูปสินค้า (สาธารณะ) — เสิร์ฟเฉพาะโฟลเดอร์ products/ และ banners/ (สลิปดูได้ทางแอดมินเท่านั้น)
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get("p") ?? "";
  if (!FILE_RE.test(p) || !(p.startsWith("products/") || p.startsWith("banners/"))) return new Response("not found", { status: 404 });
  const f = await readFile(p);
  if (!f) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(f.data), { headers: fileHeaders(f.type, "public, max-age=86400") });
}
