import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { backupFilename, buildBackup } from "@/lib/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ดาวน์โหลดสำรองข้อมูล (JSON) — เฉพาะแอดมิน super */
export async function GET() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s || (s.role !== "super" && s.role !== "ceo") || !canAccess(s.role, "/admin/applicants")) return new Response("unauthorized", { status: 401 });
  const dump = await buildBackup();
  return new Response(JSON.stringify(dump, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${backupFilename()}"`, "Cache-Control": "no-store" },
  });
}
