import Link from "next/link";
import { listCategories, listPublished, listVendors } from "@/lib/market/store";
import { AGE_NOTICE } from "@/lib/market/config";
import { MarketHeader } from "./market-ui";
import { MarketFooter, TrustBar } from "./market-bits";
import { ProductCard } from "./product-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "สินค้าเข้าค่าย · Mister Bamrungsuk" };

type SP = { q?: string; cat?: string; vendor?: string; min?: string; max?: string; sort?: string };

// ค้นหา + กรอง (หมวด / ช่วงราคา / ร้านค้า) — ฟอร์ม GET ธรรมดา ไม่ต้องใช้ JS
export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [products, vendors, categories] = await Promise.all([listPublished(), listVendors(), listCategories()]);
  const q = (sp.q ?? "").trim().toLowerCase();
  const min = sp.min ? Number(sp.min) : null, max = sp.max ? Number(sp.max) : null;
  let rows = products.filter((p) =>
    (!q || `${p.name} ${p.description}`.toLowerCase().includes(q)) &&
    (!sp.cat || categories.find((c) => c.slug === sp.cat)?.id === p.category_id) &&
    (!sp.vendor || vendors.find((v) => v.slug === sp.vendor)?.id === p.vendor_id) &&
    (min == null || p.price >= min) && (max == null || p.price <= max),
  );
  if (sp.sort === "price-asc") rows = [...rows].sort((a, b) => a.price - b.price);
  else if (sp.sort === "price-desc") rows = [...rows].sort((a, b) => b.price - a.price);
  else rows = [...rows].reverse();
  const active = !!(q || sp.cat || sp.vendor || min != null || max != null);
  const field = "input-dark h-11 text-sm";

  return (
    <main className="min-h-dvh bg-ink-900 text-ink-100">
      <MarketHeader />
      <TrustBar />
      <section className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-gold-500">SHOP</p>
        <h1 className="text-3xl font-semibold mt-1">สินค้าเข้าค่าย</h1>
        <p className="text-ink-300 text-sm mt-1">ทุกรายการมีเลข อย. · {AGE_NOTICE}</p>

        <nav className="flex flex-wrap gap-2 mt-5" aria-label="หมวดหมู่">
          <Link href="/products" className={`chip h-9 px-3.5 ${!sp.cat ? "chip-red" : ""}`}>ทั้งหมด</Link>
          {categories.map((c) => <Link key={c.id} href={`/products?cat=${c.slug}`} className={`chip h-9 px-3.5 ${sp.cat === c.slug ? "chip-red" : ""}`}>{c.name}</Link>)}
        </nav>

        <form method="get" className="glass rounded-3xl p-4 mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
          <input name="q" defaultValue={sp.q ?? ""} placeholder="ค้นหาสินค้า" aria-label="ค้นหาสินค้า" className={field} />
          <select name="cat" defaultValue={sp.cat ?? ""} aria-label="หมวดหมู่" className={field}>
            <option value="">ทุกหมวด</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
          <select name="vendor" defaultValue={sp.vendor ?? ""} aria-label="ร้านค้า" className={field}>
            <option value="">ทุกร้าน</option>
            {vendors.map((v) => <option key={v.id} value={v.slug}>{v.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input name="min" inputMode="numeric" defaultValue={sp.min ?? ""} placeholder="ราคาต่ำสุด" aria-label="ราคาต่ำสุด" className={`${field} w-full`} />
            <input name="max" inputMode="numeric" defaultValue={sp.max ?? ""} placeholder="สูงสุด" aria-label="ราคาสูงสุด" className={`${field} w-full`} />
          </div>
          <select name="sort" defaultValue={sp.sort ?? ""} aria-label="เรียงลำดับ" className={field}>
            <option value="">ใหม่ล่าสุด</option>
            <option value="price-asc">ราคาต่ำ → สูง</option>
            <option value="price-desc">ราคาสูง → ต่ำ</option>
          </select>
          <button className="btn-crimson h-11 px-5 rounded-full text-sm font-semibold">ค้นหา</button>
        </form>
        {active && <p className="text-xs text-ink-300 mt-3">พบ {rows.length} รายการ · <Link href="/products" className="text-gold-300 underline">ล้างตัวกรอง</Link></p>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {rows.map((p) => <ProductCard key={p.id} p={p} vendor={vendors.find((v) => v.id === p.vendor_id)?.name} />)}
        </div>
        {!rows.length && <p className="text-sm text-ink-300 mt-6">{active ? "ไม่พบสินค้าที่ตรงกับตัวกรอง" : "ยังไม่มีสินค้า"}</p>}
      </section>
      <MarketFooter />
    </main>
  );
}
