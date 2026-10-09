import { notFound } from "next/navigation";
import { bundleOf, getProduct, getSettings, isPublic, listCategories, listOrders, listProducts, listVendors, relatedOf, visibleReviews } from "@/lib/market/store";
import { ProductDetailView } from "./detail-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await getProduct((await params).id);
  return { title: `${p?.name ?? "สินค้า"} · Mister Bamrungsuk` };
}

// รายละเอียดสินค้า (ตามบอร์ด ProductDetail) — เลข อย. / คำเตือน / จัดส่ง / ร้าน / ซื้อคู่กัน / รีวิว / สินค้าเกี่ยวข้อง
export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProduct(id);
  if (!p || !isPublic(p)) notFound();
  const [vendors, all, orders, reviews, categories, settings] = await Promise.all([listVendors(), listProducts(), listOrders(), visibleReviews(p.id), listCategories(), getSettings()]);
  const vendor = vendors.find((v) => v.id === p.vendor_id);
  const withV = <T extends { vendor_id: string }>(x: T) => {
    const v = vendors.find((y) => y.id === x.vendor_id);
    return { ...x, vendor_name: v?.name ?? "", vendor_slug: v?.slug ?? "" };
  };
  const bundle = bundleOf(p, all, orders, 2);
  return (
    <ProductDetailView
      p={withV(p)}
      kind={categories.find((c) => c.id === p.category_id)?.name ?? ""}
      vendor={vendor ? { name: vendor.name, slug: vendor.slug ?? vendor.id, count: all.filter((x) => x.vendor_id === vendor.id && isPublic(x)).length } : null}
      bundle={bundle.items.map(withV)}
      bundleAuto={bundle.auto}
      related={relatedOf(p, all, 5).map(withV)}
      reviews={reviews.map((r) => ({ id: r.id, name: r.name, stars: r.stars, text: r.text, created_at: r.created_at }))}
      ship={{ fee: settings.shipping_fee, free: settings.free_threshold, days: settings.delivery_days }}
    />
  );
}
