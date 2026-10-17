import { NextResponse } from "next/server";
import { fileHeaders } from "@/lib/file-guard";
import { cookies } from "next/headers";
import { currentCustomer, clientIp, rateLimited } from "@/lib/customer/auth";
import { currentPartner } from "@/lib/partner/auth";
import { currentVendor } from "@/lib/market/vendor-auth";
import { SALES_COOKIE, readSalesLink } from "@/lib/member";
import { AVATAR_OWNERS, avatarFile, getAvatar, saveAvatar, type AvatarOwner } from "@/lib/avatar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// รูปโปรไฟล์ของบัญชีที่ล็อกอินอยู่ (?as=customer|partner|vendor|sales) — เจ้าของเห็น/แก้ได้เท่านั้น
async function ownerId(as: AvatarOwner): Promise<string | null> {
  if (as === "customer") return (await currentCustomer())?.sub ?? null;
  if (as === "partner") return (await currentPartner())?.id ?? null;
  if (as === "vendor") return (await currentVendor())?.vendor.id ?? null;
  return readSalesLink((await cookies()).get(SALES_COOKIE)?.value);
}
const asOf = (v: unknown): AvatarOwner | null => (AVATAR_OWNERS.includes(v as AvatarOwner) ? (v as AvatarOwner) : null);

// GET ?as=…  → { avatar: {pos, zoom, v} | null } · ?as=…&img=1 → ไฟล์รูป
export async function GET(req: Request) {
  const u = new URL(req.url);
  const as = asOf(u.searchParams.get("as"));
  const id = as ? await ownerId(as) : null;
  if (!as || !id) return NextResponse.json({ ok: false }, { status: 401 });
  if (u.searchParams.get("img")) {
    const f = await avatarFile(as, id);
    if (!f) return new Response("not found", { status: 404 });
    return new Response(new Uint8Array(f.data), { headers: fileHeaders(f.type, "private, max-age=86400") });
  }
  const a = await getAvatar(as, id).catch(() => null);
  return NextResponse.json({ ok: true, avatar: a ? { pos: a.pos, zoom: a.zoom, v: Date.parse(a.updated_at) } : null });
}

// POST multipart: as, file? (รูปใหม่), pos ("x% y%"), zoom (1–3)
export async function POST(req: Request) {
  if (rateLimited(`avatar:${clientIp(req)}`, 30, 10 * 60_000)) return NextResponse.json({ ok: false, error: "ลองบ่อยเกินไป" }, { status: 429 });
  const fd = await req.formData().catch(() => null);
  const as = asOf(fd?.get("as"));
  const id = as ? await ownerId(as) : null;
  if (!fd || !as || !id) return NextResponse.json({ ok: false }, { status: 401 });
  const file = fd.get("file");
  try {
    const a = await saveAvatar(as, id, { file: file instanceof File ? file : null, pos: fd.get("pos") ?? undefined, zoom: fd.get("zoom") ?? undefined });
    return NextResponse.json({ ok: true, avatar: { pos: a.pos, zoom: a.zoom, v: Date.parse(a.updated_at) } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
