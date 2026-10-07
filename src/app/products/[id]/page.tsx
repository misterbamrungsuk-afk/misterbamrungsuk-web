import Link from "next/link";
import { notFound } from "next/navigation";
import { bundleOf, getProduct, isPublic, listCategories, listOrders, listProducts, listVendors, relatedOf, visibleReviews } from "@/lib/market/store";
import { AGE_NOTICE, GENERAL_WARNING, baht, imageUrl } from "@/lib/market/config";
import { AddToCart, MarketHeader } from "../market-ui";
import { FdaBadge, ProductCard, ProductImage } from "../product-card";
import { DiscreetPromise, MarketFooter, SectionHead, Stars, TrustBar } from "../market-bits";
import { ReviewForm } from "../review-form";

export const dynamic = "force-dynamic";

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProduct(id);
  if (!p || !isPublic(p)) notFound();
  const [vendors, all, orders, reviews, categories] = await Promise.all([listVendors(), listProducts(), listOrders(), visibleReviews(p.id), listCategories()]);
  const vendor = vendors.find((v) => v.id === p.vendor_id);
  const category = categories.find((c) => c.id === p.category_id);
  const related = relatedOf(p, all, 4);
  const bundle = bundleOf(p, all, orders, 3);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 0;
  const vname = (vid: string) => vendors.find((v) => v.id === vid)?.name;

  return (
    <main className="min-h-dvh bg-ink-900 text-ink-100">
      <MarketHeader />
      <TrustBar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <nav className="text-sm text-ink-300 flex flex-wrap gap-1">
          <Link href="/products" className="hover:text-gold-300">สินค้าทั้งหมด</Link>
          {category && <><span>/</span><Link href={`/products?cat=${category.slug}`} className="hover:text-gold-300">{category.name}</Link></>}
        </nav>
        <div className="grid lg:grid-cols-2 gap-8 mt-4">
          <div className="flex flex-col gap-3">
            <ProductImage p={p} className="w-full aspect-square rounded-3xl" />
            {p.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.images.slice(1).map((src) => <img key={src} src={imageUrl(src)} alt="" className="aspect-square rounded-xl object-cover" />)}
              </div>
            )}
          </div>
          <div>
            <div className="flex flex-wrap gap-2"><FdaBadge />{p.age_restricted && <span className="inline-flex items-center h-6 px-2.5 rounded-full border border-crimson-500 text-crimson-200 text-[11px] font-semibold">เฉพาะ 20 ปีขึ้นไป</span>}</div>
            <h1 className="text-2xl lg:text-3xl font-semibold mt-3">{p.name}</h1>
            {vendor && <p className="text-sm text-ink-300 mt-1">โดย <Link href={`/shop/${vendor.slug}`} className="text-gold-300 hover:underline">{vendor.name}</Link></p>}
            {reviews.length > 0 && <p className="text-sm mt-1"><Stars n={avg} /> <span className="text-ink-300">{avg.toFixed(1)} · {reviews.length} รีวิว</span></p>}
            <p className="font-display text-3xl font-bold text-gold-300 mt-4">฿{baht(p.price)}</p>
            <AddToCart id={p.id} stock={p.stock} className="w-full h-14 mt-5 text-lg" />
            <p className="text-xs text-ink-400 mt-2">{p.stock > 0 ? `คงเหลือ ${p.stock} ชิ้น` : "สินค้าหมดชั่วคราว"}</p>
            <DiscreetPromise className="mt-5" />

            <div className="glass rounded-2xl p-4 mt-4 text-sm">
              <p className="text-ink-300">เลขทะเบียน อย.</p>
              <p className="font-semibold mt-0.5">{p.fda_no}</p>
            </div>
            {p.description && <p className="mt-6 text-ink-200 leading-relaxed whitespace-pre-line">{p.description}</p>}
            <div className="mt-6 rounded-2xl border border-crimson-500/50 bg-crimson-500/5 p-4 text-sm leading-relaxed">
              <p className="font-semibold text-crimson-200">คำเตือน</p>
              {p.warning && <p className="mt-1 whitespace-pre-line">{p.warning}</p>}
              <p className="mt-1 text-ink-300">{GENERAL_WARNING}</p>
              {p.age_restricted && <p className="mt-1 text-ink-300">{AGE_NOTICE}</p>}
            </div>
            <div className="mt-4 rounded-2xl border border-ink-600 p-4 text-sm">
              <p className="font-semibold">ใช้ได้ที่สปา/โรงแรมพาร์ทเนอร์</p>
              <p className="text-ink-300 text-xs mt-1">วางแผนนัดในสถานที่ที่ผ่านมาตรฐาน Mister Bamrungsuk</p>
              <div className="flex gap-3 mt-2"><Link href="/spas" className="text-gold-300 hover:underline">ดูสปาพาร์ทเนอร์ →</Link><Link href="/hotels" className="text-gold-300 hover:underline">ดูโรงแรมพาร์ทเนอร์ →</Link></div>
            </div>
          </div>
        </div>

        {bundle.items.length > 0 && (
          <section className="mt-12">
            <SectionHead eyebrow="BUNDLE" title="ซื้อคู่กัน" sub={bundle.auto ? "แนะนำจากสินค้าที่มักซื้อด้วยกัน" : "ร้านค้าแนะนำให้ซื้อคู่กัน"} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{bundle.items.map((x) => <ProductCard key={x.id} p={x} vendor={vname(x.vendor_id)} />)}</div>
          </section>
        )}

        <section className="mt-12">
          <SectionHead eyebrow="REVIEWS" title="รีวิวจากผู้ซื้อ" sub="เฉพาะผู้ซื้อที่ได้รับสินค้าแล้ว" />
          {reviews.length ? (
            <ul className="flex flex-col gap-3 mb-4">
              {reviews.map((r) => (
                <li key={r.id} className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-2"><Stars n={r.stars} /><span className="text-sm font-medium">{r.name}</span><span className="text-xs text-emerald-300">✓ ผู้ซื้อจริง</span><span className="ml-auto text-xs text-ink-400">{new Date(r.created_at).toLocaleDateString("th-TH")}</span></div>
                  {r.text && <p className="text-sm text-ink-200 mt-2 whitespace-pre-line">{r.text}</p>}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-300 mb-4">ยังไม่มีรีวิว</p>}
          <ReviewForm productId={p.id} />
        </section>

        {related.length > 0 && (
          <section className="mt-12">
            <SectionHead eyebrow="RELATED" title="สินค้าที่เกี่ยวข้อง" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{related.map((x) => <ProductCard key={x.id} p={x} vendor={vname(x.vendor_id)} />)}</div>
          </section>
        )}
      </div>
      <MarketFooter />
    </main>
  );
}
