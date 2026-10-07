import { FILE_RE, readFile } from "@/lib/market/store";

export const runtime = "nodejs";

// รูปสินค้า (สาธารณะ) — เสิร์ฟเฉพาะโฟลเดอร์ products/ (สลิปดูได้ทางแอดมินเท่านั้น)
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get("p") ?? "";
  if (!FILE_RE.test(p) || !p.startsWith("products/")) return new Response("not found", { status: 404 });
  const f = await readFile(p);
  if (!f) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(f.data), { headers: { "Content-Type": f.type, "Cache-Control": "public, max-age=86400" } });
}
