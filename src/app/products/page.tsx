import { shopCatalog } from "@/lib/market/catalog";
import { ProductBrowser } from "./product-browser";

export const dynamic = "force-dynamic";
export const metadata = { title: "สินค้าทั้งหมด · Mister Bamrungsuk" };

type SP = { q?: string; cat?: string; vendor?: string };

// สินค้าทั้งหมด — ค้นหา + ชิปหมวด + ตัวกรอง (ช่วงราคา / ร้านค้า) + เรียงราคา (ตามบอร์ด ProductList)
// ยังไม่มีสินค้าจริง → แคตตาล็อกตัวอย่าง (catalog.ts)
export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { products, vendors, categories, mock } = await shopCatalog();
  const rows = [...products].reverse().map((p) => {
    const v = vendors.find((x) => x.id === p.vendor_id);
    return { ...p, vendor_name: v?.name ?? "", vendor_slug: v?.slug ?? "", kind: categories.find((c) => c.id === p.category_id)?.name ?? "" };
  });
  const usedVendors = vendors.filter((v) => products.some((p) => p.vendor_id === v.id)).map((v) => ({ id: v.id, name: v.name, slug: v.slug ?? v.id }));
  return (
    <ProductBrowser
      products={rows}
      categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      vendors={usedVendors}
      initial={{ q: sp.q ?? "", cat: sp.cat ?? "", vendor: sp.vendor ?? "" }}
      sample={mock}
    />
  );
}
