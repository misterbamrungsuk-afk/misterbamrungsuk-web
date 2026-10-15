import { readFile } from "@/lib/join/store";
import { findLiveByPublicId, photoPaths } from "@/lib/home/live";

export const runtime = "nodejs";

// รูปโปรไฟล์สาธารณะของ Part-Time ที่แอดมินเปิดแสดงบนหน้าแรกเท่านั้น (ไม่ให้ดูบัตร/เอกสาร)
export async function GET(req: Request) {
  const u = new URL(req.url);
  const id = u.searchParams.get("id") ?? "";
  const i = Math.max(0, Math.min(8, Number(u.searchParams.get("i")) || 0));
  if (!/^r[0-9a-f]{10}$/.test(id)) return new Response("not found", { status: 404 });
  const a = await findLiveByPublicId(id);
  const path = a ? photoPaths(a)[i] : undefined;
  if (!a || !path) return new Response("not found", { status: 404 });
  const f = await readFile(path);
  if (!f) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(f.data), { headers: { "Content-Type": f.type, "Cache-Control": "public, max-age=300, s-maxage=300" } });
}
