import { readFile } from "@/lib/join/store";
import { fileHeaders } from "@/lib/file-guard";
import { findLiveByPublicId, photoPaths } from "@/lib/home/live";
import { CACHE_LONG, CACHE_SHORT, fileVer, parseWidth, thumb } from "@/lib/thumb";

export const runtime = "nodejs";

// รูปโปรไฟล์สาธารณะของ Part-Time ที่แอดมินเปิดแสดงบนหน้าแรกเท่านั้น (ไม่ให้ดูบัตร/เอกสาร)
// ?w=240|480|960 = รูปย่อ (การ์ด/หมุด) · ?v= รุ่นของรูป (fileVer ของ path) ตรงกับรูปปัจจุบัน = แคชยาว · ไม่ส่ง/ไม่ตรง = แคชสั้น
export async function GET(req: Request) {
  const u = new URL(req.url);
  const id = u.searchParams.get("id") ?? "";
  const i = Math.max(0, Math.min(8, Number(u.searchParams.get("i")) || 0));
  const w = parseWidth(u.searchParams.get("w"));
  if (w === "bad") return new Response("bad width (240, 480, 960)", { status: 400 });
  if (!/^r[0-9a-f]{10}$/.test(id)) return new Response("not found", { status: 404 });
  const a = await findLiveByPublicId(id);
  const path = a ? photoPaths(a)[i] : undefined;
  if (!a || !path) return new Response("not found", { status: 404 });
  const f = await readFile(path);
  if (!f) return new Response("not found", { status: 404 });
  const out = await thumb(path, f, w);
  const v = u.searchParams.get("v");
  return new Response(new Uint8Array(out.data), { headers: fileHeaders(out.type, v && v === fileVer(path) ? CACHE_LONG : CACHE_SHORT) });
}
