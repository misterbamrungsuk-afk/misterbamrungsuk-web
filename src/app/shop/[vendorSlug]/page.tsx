import { notFound } from "next/navigation";
import { getVendorBySlug, listCategories, listPublished, listReviews } from "@/lib/market/store";
import { imageUrl } from "@/lib/market/config";
import { ShopView } from "./shop-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ vendorSlug: string }> }) {
  const v = await getVendorBySlug(decodeURIComponent((await params).vendorSlug));
  return { title: v ? `${v.name} · ร้านค้า Marketplace · Mister Bamrungsuk` : "ร้านค้า · Mister Bamrungsuk" };
}

// หน้าร้านค้า — ตามบอร์ด VendorShop.dc.html (สินค้า / เกี่ยวกับร้าน / รีวิว)
export default async function ShopPage({ params }: { params: Promise<{ vendorSlug: string }> }) {
  const { vendorSlug } = await params;
  const v = await getVendorBySlug(decodeURIComponent(vendorSlug));
  if (!v) notFound();
  const [all, reviews, cats] = await Promise.all([listPublished(), listReviews(), listCategories().catch(() => [])]);
  const products = all.filter((p) => p.vendor_id === v.id);
  const rv = reviews.filter((r) => !r.hidden && products.some((p) => p.id === r.product_id));
  const avg = rv.length ? rv.reduce((s, r) => s + r.stars, 0) / rv.length : 0;
  const catName = (id?: string | null) => cats.find((c) => c.id === id)?.name ?? "";
  return (
    <ShopView
      vendor={{ name: v.name, description: v.description ?? "", logo: v.logo ? imageUrl(v.logo) : "" }}
      products={products.map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, img: imageUrl(p.images[0]), kind: catName(p.category_id) }))}
      reviews={rv.slice(0, 20).map((r) => ({ id: r.id, stars: r.stars, text: r.text, who: r.name, item: products.find((p) => p.id === r.product_id)?.name ?? "", at: r.created_at }))}
      avg={avg}
      count={rv.length}
    />
  );
}
