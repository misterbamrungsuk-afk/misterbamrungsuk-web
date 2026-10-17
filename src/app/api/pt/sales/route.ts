import { NextResponse } from "next/server";
import { currentParttime } from "@/lib/bookings/auth";
import { MemberError, convertCommissionToBoost, repForParttime, repSummary } from "@/lib/member";
import { getMemberSettings } from "@/lib/member/tiers";
import { extraOf } from "@/lib/join/store";
import { GATE_MSG, isPtActive } from "@/lib/join/pt-ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Part-Time ชวนเปิดเมม: GET ?mb=&t= → โค้ด/ลิงก์ + คนที่ชวน + ค่าคอม · POST { mb, t, action: "boost", id } = แปลงค่าคอมรายการนั้นเป็นวงเงินโปรโมท
export async function GET(req: Request) {
  const u = new URL(req.url);
  const a = await currentParttime(u.searchParams.get("mb") ?? "", u.searchParams.get("t"));
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  // ยังไม่อนุมัติ/ยังไม่เปิดโปรไฟล์ → ยังไม่ออกโค้ดชวนเปิดเมม
  if (!isPtActive(extraOf(a))) return NextResponse.json({ ok: false, error: GATE_MSG }, { status: 409 });
  const [rep, cfg] = await Promise.all([repForParttime(a), getMemberSettings()]);
  return NextResponse.json({ ok: true, ...(await repSummary(rep)), link: `${u.origin}/ref/${rep.code}`, boostMult: cfg.boostMult, tiers: cfg.tiers });
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { mb?: string; t?: string; action?: string; id?: string };
  const a = await currentParttime(String(b.mb ?? ""), b.t || null);
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  if (!isPtActive(extraOf(a))) return NextResponse.json({ ok: false, error: GATE_MSG }, { status: 409 });
  try {
    if (b.action !== "boost") return NextResponse.json({ ok: false, error: "action" }, { status: 400 });
    return NextResponse.json({ ok: true, ...(await convertCommissionToBoost(a.id, String(b.id ?? ""))) });
  } catch (e) {
    if (e instanceof MemberError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("pt sales", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
