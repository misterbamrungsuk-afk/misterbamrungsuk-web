import Link from "next/link";
import { activeBanners, listPublished, listVendors } from "@/lib/market/store";
import { marketPartners, type MarketPartner } from "@/lib/market/partners";
import { MarketHeader } from "./products/market-ui";
import { BannerCarousel } from "./products/banner-carousel";
import { MarketFooter, TrustBar } from "./products/market-bits";
import { ProductCard } from "./products/product-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mister Bamrungsuk — Marketplace โรงแรม · สปา · สินค้า" };

// หน้าแรก (สาธารณะ): Marketplace — พาร์ทเนอร์โรงแรม / สปา + สินค้าเข้าค่าย
export default async function MarketHome() {
  const [products, vendors, partners, banners] = await Promise.all([listPublished(), listVendors(), marketPartners(), activeBanners()]);
  const vname = (id: string) => vendors.find((v) => v.id === id)?.name;

  return (
    <main className="min-h-dvh bg-ink-900 text-ink-100">
      <MarketHeader />
      <BannerCarousel banners={banners} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.14),transparent_60%),radial-gradient(ellipse_at_bottom_left,rgba(160,20,30,0.25),transparent_55%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 lg:py-24">
          <p className="text-xs font-semibold tracking-[0.3em] text-gold-500">MISTER BAMRUNGSUK</p>
          <h1 className="mt-3 text-3xl lg:text-5xl font-semibold leading-tight max-w-3xl">
            เพื่อนกิน เพื่อนเที่ยว <span className="text-gold-500">ระดับพรีเมียม</span>
          </h1>
          <p className="mt-4 text-ink-300 max-w-2xl leading-relaxed">
            โรงแรมและสปาพาร์ทเนอร์ที่ผ่านมาตรฐานบำรุงสุข พร้อมสินค้าคัดสรรที่มีเลข อย. ถูกต้อง — ทั้งหมดในที่เดียว
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/home" className="btn-crimson h-12 px-6 rounded-full inline-flex items-center font-semibold">หาเพื่อน</Link>
            <Link href="/join" className="btn-ghost h-12 px-6 rounded-full inline-flex items-center">สมัคร Part-Time</Link>
          </div>
        </div>
      </section>

      <TrustBar />

      <PartnerRow id="hotels" title="พาร์ทเนอร์โรงแรม" eyebrow="HOTELS" rows={partners.hotels} base="/hotels" />
      <PartnerRow id="spas" title="สปาพาร์ทเนอร์" eyebrow="SPAS" rows={partners.spas} base="/spas" />

      {/* สินค้า */}
      <section id="products" className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-end gap-3 mb-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.3em] text-gold-500">SHOP</p>
            <h2 className="section-title text-2xl font-semibold mt-1">สินค้าเข้าค่าย</h2>
            <p className="text-ink-300 text-sm mt-1">คัดสรรจากร้านค้าพาร์ทเนอร์ ทุกรายการมีเลข อย.</p>
          </div>
          <Link href="/products" className="ml-auto text-sm text-gold-300 hover:underline">ดูทั้งหมด →</Link>
        </div>
        {products.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 6).map((p) => <ProductCard key={p.id} p={p} vendor={vname(p.vendor_id)} />)}
          </div>
        ) : <p className="text-sm text-ink-300">ยังไม่มีสินค้า</p>}
      </section>

      {/* CTA พาร์ทเนอร์ */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="glass rounded-3xl p-6 lg:p-10 flex flex-col lg:flex-row lg:items-center gap-5">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.3em] text-gold-500">PARTNER PROGRAM</p>
            <h2 className="text-2xl font-semibold mt-1">โรงแรม / สปา / ร้านค้า อยากร่วมเป็นพาร์ทเนอร์?</h2>
            <p className="text-ink-300 text-sm mt-1">รับป้าย “ทำงานร่วมกับ Mister Bamrungsuk” และโปรโมทผ่านแพลตฟอร์ม</p>
          </div>
          <Link href="/partner" className="lg:ml-auto btn-crimson h-12 px-6 rounded-full inline-flex items-center justify-center font-semibold shrink-0">สมัครเป็นพาร์ทเนอร์</Link>
        </div>
      </section>

      <MarketFooter />
    </main>
  );
}

function PartnerRow({ id, title, eyebrow, rows, base }: { id: string; title: string; eyebrow: string; rows: MarketPartner[]; base: string }) {
  return (
    <section id={id} className="max-w-6xl mx-auto px-4 py-10">
      <p className="text-[11px] font-semibold tracking-[0.3em] text-gold-500">{eyebrow}</p>
      <div className="flex items-end mb-5"><h2 className="section-title text-2xl font-semibold mt-1">{title}</h2><Link href={base} className="ml-auto text-sm text-gold-300 hover:underline">ดูทั้งหมด →</Link></div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x pb-2">
        {rows.map((p) => (
          <Link href={`${base}/${p.id}`} key={p.id} className="glass glass-hover rounded-3xl p-5 min-w-[240px] sm:min-w-[280px] snap-start flex flex-col gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[linear-gradient(135deg,#3a1a1a,#1a1010)] border border-gold-500/40 grid place-items-center font-display text-gold-300 text-lg">{p.name.slice(0, 1)}</div>
            <div>
              <p className="font-semibold leading-snug">{p.name}</p>
              <p className="text-xs text-ink-300 mt-0.5">{p.type} · {p.area}</p>
            </div>
            <span className="self-start inline-flex items-center h-7 px-3 rounded-full border border-gold-500/60 text-gold-300 text-[11px] font-semibold">ทำงานร่วมกับ Mister Bamrungsuk</span>
          </Link>
        ))}
      </div>
      {rows.some((r) => r.sample) && <p className="text-[11px] text-ink-400 mt-2">* ข้อมูลตัวอย่าง รอรายชื่อพาร์ทเนอร์จริง</p>}
    </section>
  );
}
