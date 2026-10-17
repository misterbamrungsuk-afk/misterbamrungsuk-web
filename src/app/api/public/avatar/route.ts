import { avatarFile } from "@/lib/avatar";
import { fileHeaders } from "@/lib/file-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// โลโก้สาธารณะ: เฉพาะพาร์ทเนอร์ (โรงแรม/สปา) และร้านค้า — รูปลูกค้า/Sale Man ไม่เปิดผ่านเส้นนี้
export async function GET(req: Request) {
  const u = new URL(req.url);
  const t = u.searchParams.get("t"), id = u.searchParams.get("id") ?? "";
  if ((t !== "partner" && t !== "vendor") || !id || id.length > 80) return new Response("not found", { status: 404 });
  const f = await avatarFile(t, id);
  if (!f) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(f.data), { headers: fileHeaders(f.type, "public, max-age=86400, immutable") });
}
