import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { PHOTO_RE, decideClaim, listClaims, readPhoto } from "@/lib/noshow";

export const runtime = "nodejs";

async function admin() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return s && canAccess(s.role, "/admin/orders") ? s : null;
}

// รายการคำร้องผิดนัด หรือ ?photo=<path> เปิดรูปหลักฐาน
export async function GET(req: Request) {
  if (!(await admin())) return NextResponse.json({ ok: false }, { status: 401 });
  const photo = new URL(req.url).searchParams.get("photo");
  if (photo) {
    if (!PHOTO_RE.test(photo)) return new Response("bad path", { status: 400 });
    const f = await readPhoto(photo);
    if (!f) return new Response("not found", { status: 404 });
    return new Response(new Uint8Array(f.data), { headers: { "Content-Type": f.type, "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json({ ok: true, claims: await listClaims() });
}

// ตัดสิน: { id, decision: "customer_no_show" | "provider_no_show" }
export async function POST(req: Request) {
  const s = await admin();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; decision?: string };
  if (!b.id || (b.decision !== "customer_no_show" && b.decision !== "provider_no_show")) return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  try {
    const claim = await decideClaim(b.id, b.decision, s.email);
    return claim ? NextResponse.json({ ok: true, claim }) : NextResponse.json({ ok: false, error: "ตัดสินไปแล้วหรือไม่พบ" }, { status: 409 });
  } catch (e) {
    console.error("noshow decide", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
