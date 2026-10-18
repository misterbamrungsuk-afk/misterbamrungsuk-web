import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { currentCustomer } from "@/lib/customer/auth";
import { findLiveByPublicId } from "@/lib/home/live";
import { InterestError, isInterested, openPost, setInterest } from "@/lib/interests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PID = /^r[0-9a-f]{10}$/;

// ลูกค้ากด "สนใจ" ประกาศ "วันนี้ว่าง" ของเพื่อน
// GET ?pid= → { open, interested } (ไม่ล็อกอิน = interested false) · POST { pid, on } → { interested, already }
export async function GET(req: Request) {
  const pid = new URL(req.url).searchParams.get("pid") ?? "";
  if (!PID.test(pid)) return NextResponse.json({ ok: false }, { status: 404 });
  const a = await findLiveByPublicId(pid).catch(() => null);
  if (!a) return NextResponse.json({ ok: false }, { status: 404 });
  const me = await currentCustomer().catch(() => null);
  const open = !!openPost(a);
  return NextResponse.json({ ok: true, open, login: !!me, interested: open && me ? await isInterested(a, me.sub).catch(() => false) : false });
}

export async function POST(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (await limited(`pt-interest:${me.sub}`, 30, 60 * 60_000)) return NextResponse.json({ ok: false, error: "กดบ่อยเกินไป ลองใหม่ภายหลัง" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { pid?: string; on?: boolean };
  const pid = String(b.pid ?? "");
  if (!PID.test(pid)) return NextResponse.json({ ok: false, error: "ไม่พบประกาศ" }, { status: 404 });
  const a = await findLiveByPublicId(pid).catch(() => null);
  if (!a) return NextResponse.json({ ok: false, error: "ไม่พบประกาศ" }, { status: 404 });
  try {
    const r = await setInterest(a, me, b.on !== false);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof InterestError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    console.error("pt interest", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
