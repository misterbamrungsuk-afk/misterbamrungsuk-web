import { NextResponse } from "next/server";
import { marketAdmin } from "@/lib/market/admin";
import { listOrders, listPayouts, listVendors, readFile, recordPayout, reportCsv, saveFile, vendorReport } from "@/lib/market/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?vendor=&month=&format=csv → รายงานรายเดือนต่อร้าน (gross, ส่วนลด, GP, ค่าส่ง, ยอดที่ต้องโอน)
// GET ?slip=<payout id> → รูปสลิปการโอน
export async function GET(req: Request) {
  if (!(await marketAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const [orders, vendors, payouts] = await Promise.all([listOrders(), listVendors(), listPayouts()]);
  if (sp.get("slip")) {
    const p = payouts.find((x) => x.id === sp.get("slip"));
    const f = p?.slip_path ? await readFile(p.slip_path) : null;
    if (!f) return new Response("not found", { status: 404 });
    return new Response(new Uint8Array(f.data), { headers: { "Content-Type": f.type, "Cache-Control": "private, no-store" } });
  }
  let rows = vendorReport(orders, vendors, payouts, sp.get("vendor") || undefined);
  if (sp.get("month")) rows = rows.filter((r) => r.month === sp.get("month"));
  if (sp.get("format") === "csv")
    return new Response(reportCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="market-payout-${sp.get("month") || "all"}.csv"` } });
  return NextResponse.json({ ok: true, rows });
}

// POST multipart {vendor_id, month, paid_at, ref, slip?} → "บันทึกการโอนแล้ว" (ยอดคิดจากรายงาน ณ ตอนบันทึก)
export async function POST(req: Request) {
  const admin = await marketAdmin();
  if (!admin) return NextResponse.json({ ok: false }, { status: 401 });
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ ok: false, error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const s = (k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
  const vendor_id = s("vendor_id", 80), month = s("month", 7), ref = s("ref");
  const paid = s("paid_at", 40);
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ ok: false, error: "เดือนไม่ถูกต้อง" }, { status: 400 });
  if (!ref) return NextResponse.json({ ok: false, error: "ใส่เลขอ้างอิงการโอน" }, { status: 400 });
  const paid_at = paid && !Number.isNaN(Date.parse(paid)) ? new Date(paid).toISOString() : new Date().toISOString();
  const [orders, vendors, payouts] = await Promise.all([listOrders(), listVendors(), listPayouts()]);
  const row = vendorReport(orders, vendors, payouts, vendor_id).find((r) => r.month === month);
  if (!row) return NextResponse.json({ ok: false, error: "ไม่มียอดของร้านนี้ในเดือนนี้" }, { status: 400 });
  if (row.pendingGp > 0) return NextResponse.json({ ok: false, error: "ยังมียอดที่ GP รอกำหนด — ตั้ง GP % แล้วกดคำนวณ GP ใหม่ก่อน" }, { status: 400 });
  let slip_path: string | null = null;
  const f = fd.get("slip");
  if (f instanceof File && f.size) {
    slip_path = await saveFile("payouts", f);
    if (!slip_path) return NextResponse.json({ ok: false, error: "สลิปต้องเป็น JPG/PNG/WebP ไม่เกิน 8MB" }, { status: 400 });
  }
  try {
    const payout = await recordPayout({ vendor_id, month, gross: row.gross, discount: row.discount, gp: row.gp, shipping: row.shipping, amount: row.payout, paid_at, ref, slip_path, recorded_by: admin.email });
    return NextResponse.json({ ok: true, payout });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 409 });
  }
}
