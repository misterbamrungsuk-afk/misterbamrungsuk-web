import { NextResponse } from "next/server";
import { currentVendor } from "@/lib/market/vendor-auth";
import { vendorData } from "@/lib/market/vendor-data";
import { listVendors, reportCsv, setVendorShipping, upsertVendor } from "@/lib/market/store";
import { flaggedClaims } from "@/lib/market/config";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ข้อมูลพอร์ทัลร้านค้า (เฉพาะของร้านที่ล็อกอิน) · ?format=csv → รายงานรายเดือน
export async function GET(req: Request) {
  const me = await currentVendor();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const d = await vendorData(me.vendor);
  if (new URL(req.url).searchParams.get("format") === "csv")
    return new Response(reportCsv(d.report), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="payout-${me.vendor.id.slice(0, 8)}.csv"` } });
  return NextResponse.json({ ok: true, email: me.account.email, ...d });
}

// ร้านแก้ชื่อ/คำอธิบาย/ช่องทางติดต่อของร้านตัวเอง (ไม่มีขั้นอนุมัติสำหรับข้อมูลร้าน — slug คงเดิม ลิงก์ไม่เสีย) → แจ้งทีมงานทางอีเมล
export async function POST(req: Request) {
  const me = await currentVendor();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // ค่าส่งของร้าน (บาท/ออเดอร์) + เกณฑ์ส่งฟรี — ค่าส่งว่าง = ใช้ค่าส่งกลางของ Marketplace
  if (b.op === "shipping") {
    const opt = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
    const fee = opt(b.shipping_fee), free = opt(b.free_threshold);
    if ([fee, free].some((n) => n != null && !(Number.isFinite(n) && n >= 0 && n <= 100000))) return NextResponse.json({ ok: false, error: "จำนวนเงินไม่ถูกต้อง" }, { status: 400 });
    try { return NextResponse.json({ ok: true, vendor: await setVendorShipping(me.vendor.id, fee, free) }); }
    catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 }); }
  }
  const name = String(b.name ?? "").trim().slice(0, 80);
  const description = String(b.description ?? "").trim().slice(0, 2000);
  const contact = String(b.contact ?? "").trim().slice(0, 200);
  if (name.length < 2) return NextResponse.json({ ok: false, error: "ใส่ชื่อร้าน" }, { status: 400 });
  if ((await listVendors()).some((v) => v.id !== me.vendor.id && v.name.trim().toLowerCase() === name.toLowerCase())) return NextResponse.json({ ok: false, error: "ชื่อร้านนี้มีร้านอื่นใช้แล้ว" }, { status: 409 });
  try {
    const v = await upsertVendor({ id: me.vendor.id, name, contact, gp_pct: me.vendor.gp_pct, description });
    const admin = process.env.ADMIN_NOTIFY_EMAIL;
    const flagged = flaggedClaims(`${name} ${description}`);
    if (admin) void sendEmail({ to: admin.split(",").map((x) => x.trim()), subject: `[ร้านค้าแก้ข้อมูล] ${me.vendor.name}${me.vendor.name !== name ? ` → ${name}` : ""}`, html: `<p>ร้าน ${me.vendor.id} แก้ข้อมูลร้าน${flagged.length ? ` · ⚠ คำโฆษณา: ${flagged.join(", ")}` : ""}</p><p>ตรวจได้ที่ /admin/market</p>` }).catch(() => false);
    return NextResponse.json({ ok: true, vendor: v, flagged });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
