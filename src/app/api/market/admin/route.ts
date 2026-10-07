import { NextResponse } from "next/server";
import { marketAdmin } from "@/lib/market/admin";
import { listOrders, listProducts, listVendors, marketDemo, monthlySummary } from "@/lib/market/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await marketAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const [vendors, products, orders] = await Promise.all([listVendors(), listProducts(), listOrders()]);
  return NextResponse.json({ ok: true, demo: marketDemo(), vendors, products, orders, summary: monthlySummary(orders, vendors) });
}
