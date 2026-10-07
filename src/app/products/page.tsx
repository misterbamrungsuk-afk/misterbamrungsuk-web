import { listPublished, listVendors } from "@/lib/market/store";
import { AGE_NOTICE } from "@/lib/market/config";
import { MarketHeader } from "./market-ui";
import { ProductCard } from "./product-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "สินค้าเข้าค่าย · Mister Bamrungsuk" };

export default async function ProductsPage() {
  const [products, vendors] = await Promise.all([listPublished(), listVendors()]);
  return (
    <main className="min-h-dvh bg-ink-900 text-ink-100">
      <MarketHeader />
      <section className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-gold-500">SHOP</p>
        <h1 className="text-3xl font-semibold mt-1">สินค้าเข้าค่าย</h1>
        <p className="text-ink-300 text-sm mt-1">ทุกรายการมีเลข อย. · {AGE_NOTICE}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {products.map((p) => <ProductCard key={p.id} p={p} vendor={vendors.find((v) => v.id === p.vendor_id)?.name} />)}
        </div>
        {!products.length && <p className="text-sm text-ink-300 mt-6">ยังไม่มีสินค้า</p>}
      </section>
    </main>
  );
}
