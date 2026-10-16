import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { getTopup, readSlip } from "@/lib/wallet";

export const runtime = "nodejs";

// รูปสลิปเติมเงิน — แอดมินฝ่ายการเงินเท่านั้น
export async function GET(req: Request) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s || !canAccess(s.role, "/admin/wallet")) return new NextResponse("forbidden", { status: 403 });
  const t = await getTopup(new URL(req.url).searchParams.get("id") ?? "");
  if (!t?.slip_path) return new NextResponse("not found", { status: 404 });
  const f = await readSlip(t.slip_path);
  if (!f) return new NextResponse("not found", { status: 404 });
  return new NextResponse(new Uint8Array(f.data), { headers: { "Content-Type": f.type, "Cache-Control": "private, no-store" } });
}
