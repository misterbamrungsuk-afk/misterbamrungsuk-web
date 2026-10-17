import { NextResponse } from "next/server";
import { marketAdmin } from "@/lib/market/admin";
import { flaggedClaims } from "@/lib/market/config";
import { getProduct, listCategories, listVendors, removeProduct, saveFile, saveProduct } from "@/lib/market/store";

export const runtime = "nodejs";

// เพิ่ม/แก้สินค้า (multipart: ฟิลด์ + รูปใหม่ "image" หลายไฟล์ได้, keep_images = path ที่เก็บไว้คั่นด้วย ,) — publish ต้องมีเลข อย.
export async function POST(req: Request) {
  if (!(await marketAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ ok: false, error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const s = (k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);
  const id = s("id", 80) || undefined;
  const prev = id ? await getProduct(id) : null;
  if (id && !prev) return NextResponse.json({ ok: false, error: "ไม่พบสินค้า" }, { status: 404 });

  const vendor_id = s("vendor_id", 80);
  if (!(await listVendors()).some((v) => v.id === vendor_id)) return NextResponse.json({ ok: false, error: "เลือกร้านค้า" }, { status: 400 });
  const name = s("name", 160);
  const price = Math.round(Number(s("price")));
  const stock = Math.max(0, Math.floor(Number(s("stock") || 0)));
  if (!name || !(price >= 0)) return NextResponse.json({ ok: false, error: "ใส่ชื่อและราคาสินค้า" }, { status: 400 });
  const published = s("published") === "1";
  const fda_no = s("fda_no", 80) || null;
  if (published && !fda_no) return NextResponse.json({ ok: false, error: "ต้องใส่เลข อย. ก่อนเผยแพร่" }, { status: 400 });

  const keep = fd.has("keep_images") ? s("keep_images", 4000).split(",") : null;
  const images = (prev?.images ?? []).filter((p) => !keep || keep.includes(p));
  for (const f of fd.getAll("image")) {
    if (!(f instanceof File) || !f.size) continue;
    const path = await saveFile("products", f);
    if (!path) return NextResponse.json({ ok: false, error: "รูปต้องเป็น JPG/PNG/WebP ไม่เกิน 8MB" }, { status: 400 });
    images.push(path);
  }
  const description = s("description", 4000), warning = s("warning", 1000);
  const cat = s("category_id", 80);
  const category_id = cat && (await listCategories()).some((c) => c.id === cat) ? cat : null;
  const bundle_ids = s("bundle_ids", 2000).split(",").map((x) => x.trim()).filter((x) => x && x !== id).slice(0, 6);
  const approved = fd.has("approved") ? s("approved") === "1" : prev?.approved ?? true;
  try {
    const p = await saveProduct({ id, vendor_id, name, description, warning, price, stock, images: images.slice(0, 8), fda_no, published, age_restricted: s("age_restricted") !== "0", category_id, bundle_ids, approved });
    return NextResponse.json({ ok: true, product: p, flagged: flaggedClaims(`${name} ${description}`) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}

// ลบสินค้า (?id=) — เคยมีออเดอร์ = ซ่อนจากหน้าเว็บแทน (archived)
export async function DELETE(req: Request) {
  if (!(await marketAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  try { return NextResponse.json({ ok: true, ...(await removeProduct(new URL(req.url).searchParams.get("id") ?? "")) }); }
  catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 }); }
}
