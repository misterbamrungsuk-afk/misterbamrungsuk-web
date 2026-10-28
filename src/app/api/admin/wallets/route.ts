import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { history, type OwnerType } from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: OwnerType[] = ["parttime", "sales", "partner", "vendor", "customer"];

// ประวัติรายการกระเป๋าเงินของเจ้าของคนหนึ่ง (หน้า /admin/wallets) — ?type=&id=
export async function GET(req: Request) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s || !canAccess(s.role, "/admin/wallets")) return NextResponse.json({ ok: false }, { status: 401 });
  const u = new URL(req.url);
  const type = u.searchParams.get("type") as OwnerType, id = String(u.searchParams.get("id") ?? "").slice(0, 120);
  if (!TYPES.includes(type) || !id) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true, history: await history(type, id, 200).catch(() => []) });
}
