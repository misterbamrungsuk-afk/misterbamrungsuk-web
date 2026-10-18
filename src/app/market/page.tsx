/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { shopCatalog } from "@/lib/market/catalog";
import { SAMPLE_NOTE } from "@/lib/market/mock";
import { getCovers } from "@/lib/covers";
import { SiteFooter } from "@/components/site-footer";
import { BoxIcon, CartCount, CartIcon, LINE, RED_GRAD } from "../products/m-kit";
import { SiteHeader } from "@/components/site-header";
import { sized } from "@/lib/thumb-url";
import { MarketBanner, MarketShop } from "./market-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketplace สินค้า — Mister Bamrungsuk" };

const FALLBACK = ["/brand/market/gold-box.jpg", "/brand/market/body-oil-lavender.jpg", "/brand/home/ad-oil.jpg"];
const TRUST = ["ของแท้", "มี อย.", "นำเข้าถูกต้อง", "ร้านตรวจสอบแล้ว"];

// Marketplace = สินค้าอย่างเดียว — สไลด์โฆษณาสินค้าบนสุด + สินค้าแนะนำ + สินค้าคัดสรร (โรงแรม/สปาแยกไป /stay)
export default async function MarketHome() {
  // ยังไม่มีสินค้าจริง → แคตตาล็อกตัวอย่างตามบอร์ด (catalog.ts)
  const cat = await shopCatalog();
  const { products, vendors, banners, categories, featured } = cat;
  // รูปจากแอดมิน "รูปหน้าปก": แบนเนอร์ แทนรูปของแบนเนอร์ตามลำดับ (ข้อความ/ลิงก์คงเดิม) · รูปเกินจำนวนแบนเนอร์ = แบนเนอร์รูปล้วน
  const bannerImgs = await getCovers("market_banner");
  const slides = (bannerImgs.length
    ? bannerImgs.map((image, k) => (banners[k] ? { ...banners[k], image } : { id: "cover-" + k, title: "", subtitle: "", image, link: "", sort: k, active: true }))
      .concat(banners.slice(bannerImgs.length))
    : banners);
  const rows = [...products].reverse().map((p) => {
    const v = vendors.find((x) => x.id === p.vendor_id);
    return { ...p, vendor_name: v?.name ?? "", vendor_slug: v?.slug ?? "", kind: categories.find((c) => c.id === p.category_id)?.name ?? "" };
  });
  const firstVendor = vendors.find((v) => products.some((p) => p.vendor_id === v.id));
  const ql = "lux-card min-h-11 grid place-items-center rounded-xl border bg-[#211a18] text-[#f3ead9] text-[12.5px] font-semibold text-center";
  const sec = (eb: string, title: string, href: string) => (
    <div className="flex justify-between items-end mx-[18px] mt-[22px] mb-2.5">
      <div><p className="text-[11.5px] tracking-[2.5px] text-[#e8c472] font-semibold">{eb}</p><h2 className="font-lux font-semibold text-[18px] mt-0.5">{title}</h2></div>
      <Link href={href} className="text-[12.5px] text-[#e8c472] min-h-8 inline-flex items-center">ดูทั้งหมด →</Link>
    </div>
  );
  const circle = "relative w-11 h-11 rounded-full border border-[rgba(246,239,228,.3)] bg-black/40 grid place-items-center text-[#f3ead9]";

  return (
    <main className="mb-v7 mb-c w-full max-w-[480px] md:max-w-[760px] lg:max-w-[1120px] mx-auto min-h-dvh bg-[#171211] text-[#f3ead9] relative overflow-x-hidden pb-[84px]">
      <SiteHeader right={<div className="flex gap-2 shrink-0">
            <Link href="/orders/track" aria-label="ติดตามคำสั่งซื้อ" className={circle}><BoxIcon /></Link>
            <Link href="/cart" aria-label="ตะกร้าสินค้า" className={circle}><CartIcon /><CartCount /></Link>
          </div>} />
      {slides.length > 0 && <MarketBanner banners={slides} fallback={FALLBACK} tall />}

      {featured && (
        <Link href={`/products/${featured.id}`} aria-label={`${featured.title} สินค้าแนะนำ`} className="lux-card block mx-[18px] mt-3.5 rounded-[18px] overflow-hidden border bg-[#211a18] text-[#f3ead9] md:flex md:items-stretch" style={{ borderColor: LINE }}>
          <div className="relative md:w-[300px] lg:w-[360px] md:shrink-0">
            <img src={sized(featured.image, 960)} alt={featured.title} className="block w-full aspect-[782/787] object-cover" />
            <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#e8c472] text-[#1b130b] text-xs font-bold tracking-[1px]">สินค้าแนะนำ</span>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:flex-col md:items-start md:justify-center md:px-8">
            <div className="min-w-0"><div className="font-lux font-semibold text-[17px] lg:text-[24px]">{featured.title}</div><div className="text-xs text-[#d9c9b4] lg:text-sm">{featured.sub}</div>{cat.mock && <div className="text-[11px] text-[#b5a596] mt-0.5">สินค้าตัวอย่าง</div>}</div>
            <span className="shrink-0 min-h-9 px-3 rounded-full border border-[#e8c472] text-[#e8c472] text-[12.5px] font-semibold inline-flex items-center">฿{featured.price.toLocaleString("en-US")} · ดูสินค้า</span>
          </div>
        </Link>
      )}

      <div className="mx-[18px] mt-3 grid grid-cols-4 gap-1.5 lg:gap-3">
        {TRUST.map((t) => (
          <div key={t} className="flex flex-col items-center gap-1 px-1 py-2 rounded-xl bg-[#211a18] border text-[#7fd6a3] text-center" style={{ borderColor: LINE }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
            <span className="text-[11.5px] text-[#d9c9b4] leading-snug">{t}</span>
          </div>
        ))}
      </div>
      <div className="mx-[18px] mt-2 flex gap-2.5 items-center px-3 py-2.5 rounded-[14px] bg-[#1d1712] border border-[rgba(227,195,92,.35)]">
        <span className="text-[#e8c472]"><BoxIcon /></span>
        <p className="text-xs text-[#d9c9b4] leading-normal"><b className="text-[#e8c472]">แพ็กมิดชิดทุกออเดอร์</b> · กล่องสีพื้น ไม่ระบุชื่อสินค้าหรือชื่อร้านบนหน้ากล่อง</p>
      </div>

      <nav className="mx-[18px] mt-3.5 grid grid-cols-2 lg:grid-cols-4 gap-2" aria-label="เมนู Marketplace">
        <Link href="/products" className={ql} style={{ borderColor: LINE }}>สินค้าทั้งหมด</Link>
        <Link href={firstVendor ? `/shop/${firstVendor.slug || firstVendor.id}` : "/products"} className={ql} style={{ borderColor: LINE }}>ร้านแนะนำ</Link>
        <Link href="/orders/track" className={ql} style={{ borderColor: LINE }}>ติดตามคำสั่งซื้อ</Link>
        <Link href="/policy" className={ql} style={{ borderColor: LINE }}>นโยบายร้าน</Link>
      </nav>


      {sec("SHOP", "สินค้าคัดสรร", "/products")}
      <MarketShop products={rows} hide={featured?.id} categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))} />
      {cat.mock && <p className="text-[11px] text-[#b5a596] mx-[18px] mt-2">{SAMPLE_NOTE}</p>}

      <div className="mx-[18px] mt-[22px] p-[18px] rounded-[18px] border" style={{ borderColor: "rgba(232,196,114,.55)", background: "linear-gradient(135deg, #2a1418, #211a18)" }}>
        <p className="text-[11.5px] tracking-[2.5px] text-[#e8c472] font-semibold">BECOME A PARTNER</p>
        <h2 className="font-lux font-semibold text-[18px] my-1">แบรนด์สินค้า อยากขายกับเรา?</h2>
        <p className="mb-3 text-[12.5px] text-[#d9c9b4]">เปิดหน้าร้านของคุณเอง ลงสินค้าและส่งของเอง รับเงินเข้ากระเป๋าร้าน</p>
        <Link href="/market/sell" className="btn-red-lux grid place-items-center h-12 rounded-[14px] border text-white font-lux font-semibold" style={{ background: RED_GRAD, borderColor: "rgba(232,196,114,.55)" }}>เปิดร้านกับเรา</Link>
        <Link href="/vendor" className="block text-center text-[12.5px] pt-3 text-[#e8c472]">เป็นร้านค้าอยู่แล้ว? เข้าพอร์ทัลร้านค้า →</Link>
      </div>

      <div className="mx-[18px] mt-[22px] pt-4 border-t text-xs text-[#b5a596] leading-[1.7]" style={{ borderColor: LINE }}>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 mb-2 [&_a]:text-[#e8c472]">
          <Link href="/policy/returns">นโยบายคืนสินค้า</Link><Link href="/policy/shipping">การจัดส่ง</Link><Link href="/policy/privacy-shop">ความเป็นส่วนตัว</Link><Link href="/join/terms">ข้อกำหนดการใช้งาน</Link><Link href="/orders/track">ติดตามคำสั่งซื้อ</Link><Link href="/market/sell">เปิดร้านกับเรา</Link>
        </div>
        ผลิตภัณฑ์เสริมอาหารไม่มีผลในการป้องกันหรือรักษาโรค · จำหน่ายเฉพาะผู้มีอายุ 20 ปีขึ้นไป
      </div>
      <SiteFooter />
    </main>
  );
}
