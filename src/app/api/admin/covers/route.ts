import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { SLOTS, addCover, imageSize, isSlot, listAll, removeCover, reorder, replaceSingle } from "@/lib/covers";

export const runtime = "nodejs";

async function allowed() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return !!s && canAccess(s.role, "/admin/covers");
}
const deny = () => NextResponse.json({ ok: false, error: "ไม่มีสิทธิ์" }, { status: 401 });
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
function revalidate() {
  for (const p of ["/", "/join", "/partner", "/market"]) revalidatePath(p);
}

export async function GET() {
  if (!(await allowed())) return deny();
  return NextResponse.json({ ok: true, rows: await listAll() });
}

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(req: Request) {
  if (!(await allowed())) return deny();
  const fd = await req.formData().catch(() => null);
  const slot = fd?.get("slot");
  const file = fd?.get("file");
  if (!isSlot(slot)) return bad("ช่องรูปไม่ถูกต้อง");
  if (!(file instanceof File)) return bad("ไม่พบไฟล์");
  const ext = TYPES[file.type];
  if (!ext) return bad("รองรับเฉพาะ JPG/PNG/WebP");
  if (file.size > 5 * 1024 * 1024) return bad("ไฟล์ใหญ่เกิน 5 MB");
  const buf = Buffer.from(await file.arrayBuffer());
  const dim = imageSize(buf);
  const cfg = SLOTS[slot];
  if (!dim || !dim.w || !dim.h) return bad("อ่านไฟล์รูปไม่ได้");
  if (Math.abs(dim.w / dim.h - cfg.ratio) / cfg.ratio > 0.03) return bad(`สัดส่วนรูปไม่ตรง (ต้องการ ${cfg.w}×${cfg.h})`);
  try {
    const row = cfg.max === 1 ? await replaceSingle(slot, buf, ext) : await addCover(slot, buf, ext);
    revalidate();
    return NextResponse.json({ ok: true, row });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ", 500);
  }
}

export async function DELETE(req: Request) {
  if (!(await allowed())) return deny();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return bad("ไม่มี id");
  try {
    const ok = await removeCover(id);
    revalidate();
    return ok ? NextResponse.json({ ok: true }) : bad("ไม่พบรูป", 404);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "ลบไม่สำเร็จ", 500);
  }
}

// { slot, ids } = จัดลำดับ · { revalidate: true } = ปุ่ม "บันทึกและขึ้นเว็บ"
export async function PATCH(req: Request) {
  if (!(await allowed())) return deny();
  const body = (await req.json().catch(() => ({}))) as { slot?: unknown; ids?: unknown; revalidate?: boolean };
  if (body.revalidate) {
    revalidate();
    return NextResponse.json({ ok: true });
  }
  if (!isSlot(body.slot) || !Array.isArray(body.ids) || !body.ids.every((x) => typeof x === "string")) return bad("ข้อมูลไม่ถูกต้อง");
  try {
    await reorder(body.slot, body.ids as string[]);
    revalidate();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "จัดลำดับไม่สำเร็จ", 500);
  }
}
