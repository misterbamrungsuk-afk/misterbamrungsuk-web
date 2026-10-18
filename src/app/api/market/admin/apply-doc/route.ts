import { marketAdmin } from "@/lib/market/admin";
import { fileHeaders } from "@/lib/file-guard";
import { getApplication, readApplyDoc } from "@/lib/market/applications";

export const runtime = "nodejs";

// เอกสารใบสมัครเปิดร้าน (บัตรประชาชน / หนังสือรับรอง / อย.) — แอดมินเท่านั้น · ?id=<ใบสมัคร>&i=<ลำดับเอกสาร>
export async function GET(req: Request) {
  if (!(await marketAdmin())) return new Response("unauthorized", { status: 401 });
  const u = new URL(req.url).searchParams;
  const a = await getApplication(u.get("id") ?? "");
  const d = a?.docs?.[Math.floor(Number(u.get("i") ?? 0))];
  const f = d ? await readApplyDoc(d.path) : null;
  if (!f) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(f.data), { headers: fileHeaders(f.type, "private, no-store") });
}
