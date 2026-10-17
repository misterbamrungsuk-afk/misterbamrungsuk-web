import { marketAdmin } from "@/lib/market/admin";
import { fileHeaders } from "@/lib/file-guard";
import { getOrder, readFile } from "@/lib/market/store";

export const runtime = "nodejs";

// รูปสลิปของคำสั่งซื้อ (แอดมินเท่านั้น)
export async function GET(req: Request) {
  if (!(await marketAdmin())) return new Response("unauthorized", { status: 401 });
  const o = await getOrder(new URL(req.url).searchParams.get("id") ?? "");
  const f = o?.slip_path ? await readFile(o.slip_path) : null;
  if (!f) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(f.data), { headers: fileHeaders(f.type, "private, no-store") });
}
