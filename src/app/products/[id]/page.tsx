import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, listVendors } from "@/lib/market/store";
import { AGE_NOTICE, GENERAL_WARNING, baht, imageUrl } from "@/lib/market/config";
import { AddToCart, MarketHeader } from "../market-ui";
import { FdaBadge, ProductImage } from "../product-card";

export const dynamic = "force-dynamic";

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProduct(id);
  if (!p || !p.published || !p.fda_no?.trim()) notFound();
  const vendor = (await listVendors()).find((v) => v.id === p.vendor_id);

  return (
    <main className="min-h-dvh bg-ink-900 text-ink-100">
      <MarketHeader />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/products" className="text-sm text-ink-300 hover:text-gold-300">← สินค้าทั้งหมด</Link>
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
            {vendor && <p className="text-sm text-ink-300 mt-1">โดย {vendor.name}</p>}
            <p className="font-display text-3xl font-bold text-gold-300 mt-4">฿{baht(p.price)}</p>
            <AddToCart id={p.id} stock={p.stock} className="w-full h-14 mt-5 text-lg" />
            <p className="text-xs text-ink-400 mt-2">{p.stock > 0 ? `คงเหลือ ${p.stock} ชิ้น` : "สินค้าหมดชั่วคราว"}</p>

            <div className="glass rounded-2xl p-4 mt-6 text-sm">
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
          </div>
        </div>
      </div>
    </main>
  );
}
