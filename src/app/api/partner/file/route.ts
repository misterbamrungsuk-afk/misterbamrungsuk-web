import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { currentPartner } from "@/lib/partner/auth";
import { PATH_RE, readPartnerFile } from "@/lib/partner/portal";

export const runtime = "nodejs";

// ไฟล์ใน bucket partners
// - รูปหน้าร้าน (…/listing/…): เปิดได้ทุกคน (ลูกค้าเห็นการ์ด)
// - สลิป (…/slips/…): เฉพาะเจ้าของ หรือแอดมินที่มีสิทธิ์ /admin/partners
export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path") ?? "";
  const m = PATH_RE.exec(path);
  if (!m) return new Response("bad path", { status: 400 });
  const isSlip = m[2] === "slips";
  if (isSlip) {
    const admin = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
    const ok = (admin && canAccess(admin.role, "/admin/partners")) || (await currentPartner())?.id === m[1];
    if (!ok) return new Response("unauthorized", { status: 401 });
  }
  const f = await readPartnerFile(path);
  if (!f) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(f.data), { headers: { "Content-Type": f.type, "Cache-Control": isSlip ? "private, no-store" : "public, max-age=86400" } });
}
