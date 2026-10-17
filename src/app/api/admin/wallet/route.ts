import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { getMoney, saveMoney, validateMoney } from "@/lib/wallet/settings";
import { notify } from "@/lib/bookings";
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
  const [topups, accounts, sum, money] = await Promise.all([listTopups({ limit: 200 }), allBalances(), ledgerSum(), getMoney()]);
  return NextResponse.json({ ok: true, topups, accounts, sum, money });
}

// { action: "approve" | "reject", id, reason?, amount_baht? } · { action: "adjust", owner_type, owner_id, bucket, amount_baht, reason, idem }
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
        const row = await rejectTopup(t.id, actor, reason);
        if (row) await notify({ user_type: "customer", user_id: t.customer_id, kind: "topup_rejected", title: "เติมเงินไม่ผ่าน", body: reason, url: "/wallet" });
        return NextResponse.json({ ok: true, row });
      }
      // ยอดที่เข้ากระเป๋า = ที่แอดมินระบุ (amount_baht) > ยอดในสลิปที่ Slip2Go อ่านได้ > ยอดที่ลูกค้ากรอก
      const given = Number(b.amount_baht);
      const amt = Number.isFinite(given) && given > 0 ? Math.round(given * 100) : t.slip_check?.amount ? Math.round(t.slip_check.amount * 100) : t.amount_satang;
      const row = await creditTopup(t, actor, amt);
      if (row) await notify({ user_type: "customer", user_id: t.customer_id, kind: "topup_credited", title: "เติมเงินเข้ากระเป๋าแล้ว", body: `฿${(amt / 100).toLocaleString()} พร้อมใช้จองได้เลย`, url: "/wallet" });
      return row ? NextResponse.json({ ok: true, row }) : NextResponse.json({ ok: false, error: "คำขอนี้ตัดสินไปแล้ว" }, { status: 409 });
    }
    if (b.action === "settings") {
      const m = b.money as Record<string, unknown> | undefined;
      const next = { minWithdraw: Number(m?.minWithdraw), feePct: Number(m?.feePct), whtPct: Number(m?.whtPct), releaseHours: Number(m?.releaseHours), releaseMode: (m?.releaseMode === "auto" ? "auto" : "manual") as "auto" | "manual", autoCompleteHours: Number(m?.autoCompleteHours), autoPayoutLimit: Number(m?.autoPayoutLimit), cancelRule: String(m?.cancelRule ?? "").slice(0, 300), autoCancel: Boolean(m?.autoCancel), cancelFullHours: Number(m?.cancelFullHours), cancelLatePct: Number(m?.cancelLatePct), quickSeconds: Number(m?.quickSeconds ?? 180) };
      const err = validateMoney(next);
      if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 });
      return NextResponse.json({ ok: true, money: await saveMoney(next, s.email, String(b.note ?? "").slice(0, 200)) });
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
