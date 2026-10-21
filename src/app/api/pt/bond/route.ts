import { NextResponse } from "next/server";
import { currentParttime } from "@/lib/bookings/auth";
import { extraOf, isDemo } from "@/lib/join/store";

// at = เวลาสมมติ (เฉพาะโหมดสาธิต · ทดสอบครบ 90 วัน)
const atOf = (v: unknown) => { const n = isDemo && !process.env.VERCEL && v ? Date.parse(String(v)) : NaN; return Number.isFinite(n) ? n : undefined; };
import { WalletError } from "@/lib/wallet";
import { BOND, bondStatus, releaseBond } from "@/lib/join/work-bond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// เงินประกันงาน (สายคำเชิญพิเศษ): GET ?mb=&t= สถานะ · POST { mb, t } ย้ายก้อนที่ครบ 90 วันเข้ายอดถอนได้
export async function GET(req: Request) {
  const u = new URL(req.url);
  const a = await currentParttime(u.searchParams.get("mb") ?? "", u.searchParams.get("t"));
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  return NextResponse.json({ ok: true, applies: !!extraOf(a).invite, rules: BOND, ...(await bondStatus(a.id, atOf(u.searchParams.get("at")))) });
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { mb?: string; t?: string; at?: string };
  const a = await currentParttime(String(b.mb ?? ""), b.t);
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  try {
    const at = atOf(b.at);
    const moved = await releaseBond(a.id, `parttime:${a.id}`, at);
    return NextResponse.json({ ok: true, moved, ...(await bondStatus(a.id, at)) });
  } catch (e) {
    if (e instanceof WalletError) return NextResponse.json({ ok: false, error: e.message }, { status: 409 });
    console.error("bond release", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
