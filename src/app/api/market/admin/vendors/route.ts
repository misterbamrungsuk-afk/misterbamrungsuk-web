import { NextResponse } from "next/server";
import { marketAdmin } from "@/lib/market/admin";
import { removeVendor, upsertVendor } from "@/lib/market/store";

export const runtime = "nodejs";

// เพิ่ม/แก้ร้านค้า — gp_pct ว่าง/null = [รอกำหนด]
export async function POST(req: Request) {
  if (!(await marketAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; name?: string; contact?: string; gp_pct?: unknown };
  const name = String(b.name ?? "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ ok: false, error: "ใส่ชื่อร้านค้า" }, { status: 400 });
  let gp: number | null = null;
  if (b.gp_pct !== null && b.gp_pct !== undefined && b.gp_pct !== "") {
    gp = Number(b.gp_pct);
    if (!Number.isFinite(gp) || gp < 0 || gp > 100) return NextResponse.json({ ok: false, error: "GP % ต้องอยู่ระหว่าง 0–100" }, { status: 400 });
  }
  try {
    const ex = b as { slug?: string; description?: string };
    const v = await upsertVendor({ id: b.id || undefined, name, contact: String(b.contact ?? "").slice(0, 300), gp_pct: gp, slug: ex.slug, description: ex.description });
    return NextResponse.json({ ok: true, vendor: v });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}

// ลบร้าน (?id=) — มีออเดอร์แล้ว = ซ่อนสินค้าทั้งร้านแทน (archived)
export async function DELETE(req: Request) {
  if (!(await marketAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  try { return NextResponse.json({ ok: true, ...(await removeVendor(new URL(req.url).searchParams.get("id") ?? "")) }); }
  catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 }); }
}
