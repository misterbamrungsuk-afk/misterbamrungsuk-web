import { notFound } from "next/navigation";
import { shopProduct } from "@/lib/market/catalog";
import { bundleOf, getSettings, isPublic, listOrders, relatedOf } from "@/lib/market/store";
import { deliveryText, vendorShipRule } from "@/lib/market/config";
import { ProductDetailView } from "./detail-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { p } = await shopProduct((await params).id);
  return { title: `${p?.name ?? "สินค้า"} · Mister Bamrungsuk` };
}

// รายละเอียดสินค้า (ตามบอร์ด ProductDetail) — เลข อย. / คำเตือน / จัดส่ง / ร้าน / ซื้อคู่กัน / รีวิว / สินค้าเกี่ยวข้อง
// ยังไม่มีสินค้าจริง → เปิดสินค้าตัวอย่างได้ (catalog.ts) · มีสินค้าจริงแล้ว id ตัวอย่าง = 404
export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { c, p } = await shopProduct(id);
  if (!p || !isPublic(p)) notFound();
  const { vendors, products: all, categories } = c;
  const [orders, settings] = await Promise.all([c.mock ? Promise.resolve([]) : listOrders(), getSettings()]);
  const reviews = c.reviews.filter((r) => r.product_id === p.id);
  const vendor = vendors.find((v) => v.id === p.vendor_id);
  const withV = <T extends { vendor_id: string }>(x: T) => {
    const v = vendors.find((y) => y.id === x.vendor_id);
    return { ...x, vendor_name: v?.name ?? "", vendor_slug: v?.slug ?? "" };
  };
  const bundle = bundleOf(p, all, orders, 2);
  // ค่าส่งของร้านนี้ (ร้านตั้งเอง / ค่าส่งกลาง) — ไม่ตั้งเลย = ส่งฟรี
  const rule = vendorShipRule(vendor, settings);
  return (
    <ProductDetailView
      p={withV(p)}
      kind={categories.find((x) => x.id === p.category_id)?.name ?? ""}
      vendor={vendor ? { name: vendor.name, slug: vendor.slug ?? vendor.id, count: all.filter((x) => x.vendor_id === vendor.id && isPublic(x)).length } : null}
      bundle={bundle.items.map(withV)}
      bundleAuto={bundle.auto}
      related={relatedOf(p, all, 5).map(withV)}
      reviews={reviews.map((r) => ({ id: r.id, name: r.name, stars: r.stars, text: r.text, created_at: r.created_at }))}
      ship={{ fee: rule.shipping_fee ?? 0, free: rule.free_threshold, days: deliveryText(settings) }}
    />
  );
}
