import { avatarFile } from "@/lib/avatar";
import { fileHeaders } from "@/lib/file-guard";
import { CACHE_LONG, CACHE_SHORT, parseWidth, thumb } from "@/lib/thumb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// โลโก้สาธารณะ: เฉพาะพาร์ทเนอร์ (โรงแรม/สปา) และร้านค้า — รูปลูกค้า/Sale Man ไม่เปิดผ่านเส้นนี้
// ?w=240|480|960 = รูปย่อ · ?v= (เวลาอัปเดตรูป จาก avatarOf) = URL เปลี่ยนเมื่อเปลี่ยนรูป → แคชยาว · ไม่มี v = แคชสั้น
export async function GET(req: Request) {
  const u = new URL(req.url);
  const t = u.searchParams.get("t"), id = u.searchParams.get("id") ?? "";
  const w = parseWidth(u.searchParams.get("w"));
  if (w === "bad") return new Response("bad width (240, 480, 960)", { status: 400 });
  if ((t !== "partner" && t !== "vendor") || !id || id.length > 80) return new Response("not found", { status: 404 });
  const f = await avatarFile(t, id);
  if (!f) return new Response("not found", { status: 404 });
  const out = await thumb(`avatar:${t}:${id}:${u.searchParams.get("v") ?? ""}`, f, w);
  return new Response(new Uint8Array(out.data), { headers: fileHeaders(out.type, u.searchParams.get("v") ? CACHE_LONG : CACHE_SHORT) });
}
