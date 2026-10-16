import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { WalletError, adjust, allBalances, creditTopup, getTopup, ledgerSum, listTopups, rejectTopup, type OwnerType } from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function admin() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return s && canAccess(s.role, "/admin/wallet") ? s : null;
}

// หลังบ้านกระเป๋าเงิน: คิวเติมเงิน · ยอดทุกบัญชี · ผลรวม ledger (ต้อง = 0)
export async function GET() {
  if (!(await admin())) return NextResponse.json({ ok: false }, { status: 401 });
  const [topups, accounts, sum] = await Promise.all([listTopups({ limit: 200 }), allBalances(), ledgerSum()]);
  return NextResponse.json({ ok: true, topups, accounts, sum });
}

// { action: "approve" | "reject", id, reason? } · { action: "adjust", owner_type, owner_id, bucket, amount_baht, reason, idem }
export async function POST(req: Request) {
  const s = await admin();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const actor = `admin:${s.email}`;
  try {
    if (b.action === "approve" || b.action === "reject") {
      const t = await getTopup(String(b.id ?? ""));
      if (!t) return NextResponse.json({ ok: false, error: "ไม่พบคำขอ" }, { status: 404 });
      if (t.status !== "pending") return NextResponse.json({ ok: false, error: "คำขอนี้ตัดสินไปแล้ว" }, { status: 409 });
      if (b.action === "reject") {
        const reason = String(b.reason ?? "").trim().slice(0, 300);
        if (!reason) return NextResponse.json({ ok: false, error: "ระบุเหตุผล" }, { status: 400 });
        return NextResponse.json({ ok: true, row: await rejectTopup(t.id, actor, reason) });
      }
      return NextResponse.json({ ok: true, row: await creditTopup(t, actor) });
    }
    if (b.action === "adjust") {
      const owner_type = String(b.owner_type) as OwnerType;
      if (!["customer", "parttime", "partner"].includes(owner_type)) return NextResponse.json({ ok: false, error: "ประเภทบัญชีไม่ถูกต้อง" }, { status: 400 });
      const amt = Math.round(Number(b.amount_baht) * 100);
      if (!Number.isFinite(amt) || amt === 0 || Math.abs(amt) > 10_000_000) return NextResponse.json({ ok: false, error: "จำนวนเงินไม่ถูกต้อง" }, { status: 400 });
      const tx = await adjust({ owner_type, owner_id: String(b.owner_id ?? "").slice(0, 100), bucket: String(b.bucket ?? "available").slice(0, 30) }, amt, String(b.reason ?? ""), actor, String(b.idem ?? crypto.randomUUID()));
      return NextResponse.json({ ok: true, tx });
    }
    return NextResponse.json({ ok: false, error: "ไม่รู้จักคำสั่ง" }, { status: 400 });
  } catch (e) {
    if (e instanceof WalletError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("admin wallet", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
