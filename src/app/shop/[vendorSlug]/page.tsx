import Link from "next/link";
import { notFound } from "next/navigation";
import { getVendorBySlug, listPublished, listReviews } from "@/lib/market/store";
import { MarketHeader } from "../../products/market-ui";
import { DiscreetPromise, MarketFooter, Stars, TrustBar } from "../../products/market-bits";
import { ProductCard } from "../../products/product-card";

export const dynamic = "force-dynamic";

// หน้าร้านค้า: ข้อมูลร้าน + สินค้าที่เผยแพร่ของร้าน
export default async function ShopPage({ params }: { params: Promise<{ vendorSlug: string }> }) {
  const { vendorSlug } = await params;
  const v = await getVendorBySlug(decodeURIComponent(vendorSlug));
  if (!v) notFound();
  const [all, reviews] = await Promise.all([listPublished(), listReviews()]);
  const products = all.filter((p) => p.vendor_id === v.id);
  const rv = reviews.filter((r) => !r.hidden && products.some((p) => p.id === r.product_id));
  const avg = rv.length ? rv.reduce((s, r) => s + r.stars, 0) / rv.length : 0;
  return (
    <main className="min-h-dvh bg-ink-900 text-ink-100">
      <MarketHeader />
      <section className="max-w-6xl mx-auto px-4 py-10">
        <Link href="/products" className="text-sm text-ink-300 hover:text-gold-300">← สินค้าทั้งหมด</Link>
        <div className="glass rounded-3xl p-6 mt-4 flex flex-col sm:flex-row gap-5 sm:items-center">
          <div className="w-20 h-20 rounded-3xl bg-[linear-gradient(135deg,#3a1a1a,#1a1010)] border border-gold-500/40 grid place-items-center font-display text-gold-300 text-3xl shrink-0">{v.name.slice(0, 1)}</div>
          <div className="flex-1">
            <p className="text-[11px] font-semibold tracking-[0.3em] text-gold-500">VERIFIED SHOP</p>
            <h1 className="text-2xl font-semibold mt-1">{v.name}</h1>
            <p className="text-sm text-ink-300 mt-1">{products.length} สินค้า{rv.length ? <> · <Stars n={avg} /> {avg.toFixed(1)} ({rv.length} รีวิว)</> : null}</p>
            <p className="text-sm text-ink-200 mt-2 whitespace-pre-line">{v.description || "รายละเอียดร้าน [รอกำหนด]"}</p>
          </div>
          <span className="self-start inline-flex items-center h-7 px-3 rounded-full border border-emerald-500/70 text-emerald-300 text-[11px] font-semibold">✓ ร้านที่ตรวจสอบแล้ว</span>
        </div>
        <DiscreetPromise className="mt-4" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">{products.map((p) => <ProductCard key={p.id} p={p} vendor={v.name} />)}</div>
        {!products.length && <p className="text-sm text-ink-300 mt-6">ร้านนี้ยังไม่มีสินค้าที่เผยแพร่</p>}
      </section>
      <TrustBar />
      <MarketFooter />
    </main>
  );
}
