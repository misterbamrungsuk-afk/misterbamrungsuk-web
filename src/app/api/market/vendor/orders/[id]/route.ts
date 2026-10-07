import { NextResponse } from "next/server";
import { CARRIERS } from "@/lib/market/config";
import { notifyStatus } from "@/lib/market/notify";
import { currentVendor } from "@/lib/market/vendor-auth";
import { getSettings, setVendorTracking } from "@/lib/market/store";

export const runtime = "nodejs";

// ร้านใส่เลขพัสดุของสินค้าตัวเองในออเดอร์ — ครบทุกร้าน → "จัดส่งแล้ว" + SMS ผู้ซื้อ
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentVendor();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { tracking_no?: string; carrier?: string };
  const carrier = CARRIERS.some((c) => c.key === b.carrier) ? String(b.carrier) : "other";
  try {
    const { order, shippedNow } = await setVendorTracking(id, me.vendor.id, String(b.tracking_no ?? ""), carrier);
    if (shippedNow) getSettings().then((s) => notifyStatus(order, s)).catch(() => {});
    return NextResponse.json({ ok: true, status: order.status, shipped: shippedNow });
  } catch (e) {
    // ไม่บอกว่ามีออเดอร์นี้อยู่หรือไม่ถ้าไม่ใช่ของร้าน
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 404 });
  }
}
