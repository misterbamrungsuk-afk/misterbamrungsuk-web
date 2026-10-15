import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { getEarnings, saveEarnings, validateEarnings, type EarningsSettings } from "@/lib/join/earnings-settings";

export const runtime = "nodejs";

// ราคาและส่วนแบ่ง (บอร์ด A-Earnings) — Super admin / การเงิน
async function session() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return s && canAccess(s.role, "/admin/earnings") ? s : null;
}

export async function GET() {
  if (!(await session())) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, data: await getEarnings() });
}

export async function PUT(req: Request) {
  const s = await session();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Partial<EarningsSettings> | null;
  if (!b) return NextResponse.json({ ok: false, error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const n = (v: unknown) => Number(v);
  const next = {
    show: !!b.show,
    price3h: { eat: { top: n(b.price3h?.eat?.top), silver: n(b.price3h?.eat?.silver) }, massage: { top: n(b.price3h?.massage?.top), silver: n(b.price3h?.massage?.silver) } },
    fiveHourMultiplier: n(b.fiveHourMultiplier),
    tiers: (b.tiers ?? []).map((t) => ({ min: n(t.min), max: t.max === null || t.max === undefined || String(t.max) === "" ? null : n(t.max), pct: n(t.pct) })),
    payout: String(b.payout ?? "").trim().slice(0, 120),
    noShow: String(b.noShow ?? "").trim().slice(0, 120),
    tipPct: n(b.tipPct),
  };
  const err = validateEarnings(next);
  if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 });
  const note = `${next.tiers.map((t) => t.pct).join(" / ")}% · นวด TOP ${next.price3h.massage.top.toLocaleString("en-US")}`;
  try {
    return NextResponse.json({ ok: true, data: await saveEarnings(next, s.email, note) });
  } catch (e) {
    console.error("save earnings failed", e);
    return NextResponse.json({ ok: false, error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}
