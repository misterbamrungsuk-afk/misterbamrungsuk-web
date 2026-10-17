import { NextResponse } from "next/server";
import { fileHeaders } from "@/lib/file-guard";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { BoostError, decideBoost, listBoosts } from "@/lib/join/boost";
import { readFile } from "@/lib/join/store";
import { notify } from "@/lib/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const admin = async () => { const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value); return s && canAccess(s.role, "/admin/boosts") ? s : null; };

// GET ?slip=<id> = รูปสลิปโปรโมท · POST { id, approve, note? } = อนุมัติ/ไม่อนุมัติสลิปที่ระบบยืนยันเองไม่ได้
export async function GET(req: Request) {
  if (!(await admin())) return new Response("unauthorized", { status: 401 });
  const id = new URL(req.url).searchParams.get("slip") ?? "";
  const b = (await listBoosts()).find((x) => x.id === id);
  const f = b?.slip_path ? await readFile(b.slip_path) : null;
  if (!f) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(f.data), { headers: fileHeaders(f.type, "private, no-store") });
}

export async function POST(req: Request) {
  const s = await admin();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; approve?: boolean; note?: string };
  try {
    const r = await decideBoost(String(b.id ?? ""), !!b.approve, s.email, String(b.note ?? "").slice(0, 120));
    await notify({ user_type: "parttime", user_id: r.parttime_id, kind: "boost", title: r.status === "active" ? "เปิดโปรโมทโปรไฟล์แล้ว" : "สลิปโปรโมทไม่ผ่าน", body: r.status === "active" ? `ขึ้นหน้าแนะนำ ${r.days} วัน` : `${b.note || "ติดต่อทีมงานทาง LINE"}`, url: `/join/profile/${r.mb}` });
    return NextResponse.json({ ok: true, status: r.status });
  } catch (e) {
    if (e instanceof BoostError) return NextResponse.json({ ok: false, error: e.message }, { status: 409 });
    console.error("boost decide", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
