import { NextResponse } from "next/server";
import { flaggedClaims } from "@/lib/market/config";
import { currentVendor } from "@/lib/market/vendor-auth";
import { getProduct, listCategories, saveFile, saveProduct } from "@/lib/market/store";

export const runtime = "nodejs";

// ร้านเพิ่ม/แก้สินค้าของตัวเอง (multipart) — การเผยแพร่ต้องมีเลข อย. + แอดมินอนุมัติ
// ร้านแก้ไขสินค้าเมื่อไหร่ สถานะอนุมัติจะถูกรีเซ็ตให้แอดมินตรวจใหม่ (กันแก้คำโฆษณาหลังอนุมัติ)
export async function POST(req: Request) {
  const me = await currentVendor();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ ok: false, error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const s = (k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);
  const id = s("id", 80) || undefined;
  const prev = id ? await getProduct(id) : null;
  if (id && (!prev || prev.vendor_id !== me.vendor.id)) return NextResponse.json({ ok: false, error: "ไม่พบสินค้า" }, { status: 404 });

  const name = s("name", 160);
  const price = Math.round(Number(s("price")));
  const stock = Math.max(0, Math.floor(Number(s("stock") || 0)));
  if (!name || !(price >= 0)) return NextResponse.json({ ok: false, error: "ใส่ชื่อและราคาสินค้า" }, { status: 400 });
  const published = s("published") === "1";
  const fda_no = s("fda_no", 80) || null;
  if (published && !fda_no) return NextResponse.json({ ok: false, error: "ต้องใส่เลข อย. ก่อนขอเผยแพร่" }, { status: 400 });
  const cat = s("category_id", 80);
  const category_id = cat && (await listCategories()).some((c) => c.id === cat) ? cat : null;

  const keep = fd.has("keep_images") ? s("keep_images", 4000).split(",") : null;
  const images = (prev?.images ?? []).filter((p) => !keep || keep.includes(p));
  for (const f of fd.getAll("image")) {
    if (!(f instanceof File) || !f.size) continue;
    const path = await saveFile("products", f);
    if (!path) return NextResponse.json({ ok: false, error: "รูปต้องเป็น JPG/PNG/WebP ไม่เกิน 8MB" }, { status: 400 });
    images.push(path);
  }
  const description = s("description", 4000), warning = s("warning", 1000);
  const contentChanged = !prev || prev.name !== name || prev.description !== description || prev.fda_no !== fda_no || prev.warning !== warning || images.join() !== prev.images.join();
  try {
    const p = await saveProduct({
      id, vendor_id: me.vendor.id, name, description, warning, price, stock, images: images.slice(0, 8), fda_no, published,
      age_restricted: s("age_restricted") !== "0", category_id, bundle_ids: prev?.bundle_ids ?? [],
      approved: contentChanged ? false : prev?.approved ?? false,
    });
    return NextResponse.json({ ok: true, product: p, flagged: flaggedClaims(`${name} ${description}`) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
