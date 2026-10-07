import { NextResponse } from "next/server";
import { listPublished } from "@/lib/market/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// สินค้าแนะนำ (แถบเล็กในหน้าจองสำเร็จ) — best effort
export async function GET() {
  const products = (await listPublished().catch(() => [])).filter((p) => p.stock > 0).slice(0, 4);
  return NextResponse.json({ ok: true, products: products.map((p) => ({ id: p.id, name: p.name, price: p.price, image: p.images[0] ?? null })) });
}
