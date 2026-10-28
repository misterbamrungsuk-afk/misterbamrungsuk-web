import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ceoSession } from "@/lib/ceo-room-auth";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { PayoutError, approvePayout, listPayoutRequests, settlePayout } from "@/lib/payouts";
import { allBalances } from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const admin = async () => { const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value); return s && canAccess(s.role, "/admin/payouts") ? s : null; };

// คำขอถอนของพาร์ทเนอร์ / ร้านค้า + ยอดกระเป๋าแต่ละเจ้า
export async function GET() {
  if (!(await admin())) return NextResponse.json({ ok: false }, { status: 401 });
  const [requests, bal] = await Promise.all([listPayoutRequests(), allBalances().catch(() => [])]);
  const wallets = new Map<string, { owner_type: string; owner_id: string; available: number; withdrawing: number }>();
  for (const b of bal) {
    if (b.owner_type !== "partner" && b.owner_type !== "vendor") continue;
    const k = `${b.owner_type}:${b.owner_id}`;
    const w = wallets.get(k) ?? { owner_type: b.owner_type, owner_id: b.owner_id, available: 0, withdrawing: 0 };
    if (b.bucket === "available") w.available += b.balance; else if (b.bucket === "withdrawing") w.withdrawing += b.balance;
    wallets.set(k, w);
  }
  return NextResponse.json({ ok: true, requests, wallets: [...wallets.values()] });
}

// CEO เท่านั้น: approve / reject · แอดมินการเงิน: paid (โอนแล้ว) / failed (โอนไม่สำเร็จ → คืนยอด)
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { action?: string; id?: string; note?: string };
  const act = String(b.action ?? ""), id = String(b.id ?? "");
  try {
    // อนุมัติ/ไม่อนุมัติ = ห้อง CEO เท่านั้น (คุกกี้ /ceo)
    if (act === "approve" || act === "reject") {
      const ceo = await ceoSession();
      if (!ceo) return NextResponse.json({ ok: false, error: "อนุมัติได้ที่ห้อง CEO (ลิงก์ /ceo) เท่านั้น" }, { status: 403 });
      return NextResponse.json({ ok: true, request: act === "approve" ? await approvePayout(id, ceo.actor) : await settlePayout(id, ceo.actor, "rejected", String(b.note ?? "")) });
    }
    const s = await admin();
    if (!s) return NextResponse.json({ ok: false }, { status: 401 });
    const actor = `admin:${s.email}`;
    if (act === "paid") return NextResponse.json({ ok: true, request: await settlePayout(id, actor, "paid") });
    if (act === "failed") return NextResponse.json({ ok: true, request: await settlePayout(id, actor, "failed", String(b.note ?? "")) });
    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch (e) {
    if (e instanceof PayoutError) return NextResponse.json({ ok: false, error: e.message }, { status: 409 });
    throw e;
  }
}
