import { NextResponse } from "next/server";
import { listPublished, listVendors } from "@/lib/market/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// สินค้าที่เผยแพร่ (มีเลข อย.) — ใช้ในตะกร้าเพื่อดึงราคาล่าสุด
export async function GET() {
  const [products, vendors] = await Promise.all([listPublished(), listVendors()]);
  return NextResponse.json({
    ok: true,
    products: products.map((p) => ({ ...p, vendor_name: vendors.find((v) => v.id === p.vendor_id)?.name ?? "" })),
  });
}
