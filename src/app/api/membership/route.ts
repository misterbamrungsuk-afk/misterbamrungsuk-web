import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentCustomer } from "@/lib/customer/auth";
import { getProfile } from "@/lib/customer/profile";
import { getMemberSettings } from "@/lib/member/tiers";
import { listPurchases, pointsOf } from "@/lib/member/store";
import { MemberError, buyMembership } from "@/lib/member";
import { limited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// เปิดเมม Gold/Black: GET = ระดับ/ราคา + สถานะของฉัน · POST multipart (tier, slip, ref?) = ส่งสลิปเปิดเมม
export async function GET() {
  const cfg = await getMemberSettings();
  const me = await currentCustomer().catch(() => null);
  const ref = (await cookies()).get("mb_ref")?.value ?? null;
  if (!me) return NextResponse.json({ ok: true, enabled: cfg.enabled, tiers: cfg.tiers, basePoints: cfg.basePointsPer100, me: null, ref });
  const [prof, pts, mine] = await Promise.all([getProfile(me.sub, me.email), pointsOf(me.sub).catch(() => ({ total: 0, rows: [] })), listPurchases({ customer_id: me.sub }).catch(() => [])]);
  return NextResponse.json({
    ok: true, enabled: cfg.enabled, tiers: cfg.tiers, basePoints: cfg.basePointsPer100, ref,
    me: { name: prof.name, tier: prof.member_tier ?? null, since: prof.member_since ?? null, no: prof.member_no ?? null, points: pts.total, history: pts.rows.slice(0, 20) },
    purchases: mine.slice(0, 10).map((p) => ({ id: p.id, tier: p.tier, pay: p.pay_satang, credit: p.credit_satang, status: p.status, reason: p.reason, at: p.created_at })),
  });
}

export async function POST(req: Request) {
  const me = await currentCustomer().catch(() => null);
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
  if (await limited(`member:${me.sub}`, 6, 10 * 60_000)) return NextResponse.json({ ok: false, error: "ส่งบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  const fd = await req.formData().catch(() => null);
  const slip = fd?.get("slip");
  if (!(slip instanceof File) || !slip.size) return NextResponse.json({ ok: false, error: "แนบสลิปการโอน" }, { status: 400 });
  if (slip.size > 8 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(slip.type)) return NextResponse.json({ ok: false, error: "สลิปต้องเป็นรูป JPG/PNG/WEBP ไม่เกิน 8MB" }, { status: 400 });
  try {
    const p = await buyMembership(me, String(fd?.get("tier") ?? ""), slip, String(fd?.get("ref") ?? "") || (await cookies()).get("mb_ref")?.value || null);
    return NextResponse.json({ ok: true, status: p.status, id: p.id });
  } catch (e) {
    if (e instanceof MemberError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("membership buy", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
