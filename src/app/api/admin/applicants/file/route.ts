import { readFile } from "@/lib/join/store";

import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";

async function allowed() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return !!s && canAccess(s.role, "/admin/applicants");
}

export const runtime = "nodejs";

// รูปถ่าย/สลิปของผู้สมัคร — เปิดได้เฉพาะแอดมิน (middleware) และเฉพาะ path รูปแบบที่ระบบสร้าง
export async function GET(req: Request) {
  if (!(await allowed())) return new Response("unauthorized", { status: 401 });
  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (!/^[0-9a-f-]{36}\/(photo|id_card|bankbook|other_doc|slip)\.(jpg|png|webp)$/.test(path)) return new Response("bad path", { status: 400 });
  const f = await readFile(path);
  if (!f) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(f.data), { headers: { "Content-Type": f.type, "Cache-Control": "private, no-store" } });
}
