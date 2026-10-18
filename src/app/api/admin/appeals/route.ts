import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { fileHeaders } from "@/lib/file-guard";
import { readFile } from "@/lib/join/store";
import { AppealError, decideAppeal, getAppeal, listAppeals, type AppealStatus } from "@/lib/appeals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const admin = async () => { const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value); return s && canAccess(s.role, "/admin/appeals") ? s : null; };

// อุทธรณ์ใบเตือน (แอดมิน)
// GET ?status= → { appeals } · GET ?photo=<id> = รูปหลักฐาน (private) · POST { id, accept, note } = รับ (ยกเลิกใบเตือน) / ไม่รับ (ต้องมีเหตุผล)
export async function GET(req: Request) {
  if (!(await admin())) return NextResponse.json({ ok: false }, { status: 401 });
  const u = new URL(req.url);
  const pid = u.searchParams.get("photo");
  if (pid) {
    const ap = await getAppeal(pid);
    const f = ap?.photo_path ? await readFile(ap.photo_path) : null;
    if (!f) return new Response("not found", { status: 404 });
    return new Response(new Uint8Array(f.data), { headers: fileHeaders(f.type, "private, no-store") });
  }
  const st = u.searchParams.get("status");
  const status = st === "pending" || st === "accepted" || st === "rejected" ? (st as AppealStatus) : undefined;
  return NextResponse.json({ ok: true, appeals: await listAppeals({ status }) });
}

export async function POST(req: Request) {
  const s = await admin();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; accept?: boolean; note?: string };
  try {
    const ap = await decideAppeal(String(b.id ?? ""), b.accept === true, s.email, String(b.note ?? ""));
    return NextResponse.json({ ok: true, status: ap.status });
  } catch (e) {
    if (e instanceof AppealError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    console.error("appeal decide", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
