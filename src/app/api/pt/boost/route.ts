import { NextResponse } from "next/server";
import { currentParttime } from "@/lib/bookings/auth";
import { ptWallet } from "@/lib/bookings/day";
import { BOOST_PLANS, BoostError, activeBoosts, buyBoostWithSlip, buyBoostWithWallet, listBoosts } from "@/lib/join/boost";
import { notify } from "@/lib/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// โปรโมทโปรไฟล์ Part-Time: GET ?mb=&t= → แผน + สถานะ · POST JSON { mb, t, plan, pay: "wallet" } หรือ multipart (mb, t, plan, slip)
export async function GET(req: Request) {
  const u = new URL(req.url);
  const a = await currentParttime(u.searchParams.get("mb") ?? "", u.searchParams.get("t"));
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  const [act, list, w] = await Promise.all([activeBoosts(), listBoosts(), ptWallet(a.id).catch(() => ({ available: 0 }))]);
  return NextResponse.json({ ok: true, plans: BOOST_PLANS, until: act.get(a.id) ?? null, pending: list.filter((b) => b.parttime_id === a.id && b.status === "pending").length, available: w.available });
}

export async function POST(req: Request) {
  const multipart = (req.headers.get("content-type") ?? "").includes("multipart/form-data");
  const fd = multipart ? await req.formData().catch(() => null) : null;
  const b = multipart ? { mb: String(fd?.get("mb") ?? ""), t: String(fd?.get("t") ?? ""), plan: String(fd?.get("plan") ?? "") } : ((await req.json().catch(() => ({}))) as { mb?: string; t?: string; plan?: string; pay?: string });
  const a = await currentParttime(String(b.mb ?? ""), b.t || null);
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  try {
    if (multipart) {
      const slip = fd?.get("slip");
      if (!(slip instanceof File) || !slip.size) return NextResponse.json({ ok: false, error: "แนบสลิปการโอน" }, { status: 400 });
      if (slip.size > 8 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(slip.type)) return NextResponse.json({ ok: false, error: "สลิปต้องเป็นรูป JPG/PNG/WEBP ไม่เกิน 8MB" }, { status: 400 });
      const r = await buyBoostWithSlip(a, String(b.plan ?? ""), slip);
      if (r.status === "pending") await notify({ user_type: "admin", user_id: "finance", kind: "boost_slip", title: `สลิปโปรโมท ${a.mb_code} รอตรวจ`, body: `฿${(r.price_satang / 100).toLocaleString()} · ${r.days} วัน`, url: "/admin/boosts" });
      return NextResponse.json({ ok: true, status: r.status, until: r.ends_at });
    }
    const r = await buyBoostWithWallet(a, String(b.plan ?? ""));
    return NextResponse.json({ ok: true, status: r.status, until: r.ends_at });
  } catch (e) {
    if (e instanceof BoostError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("boost", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
