/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { activeBanners, listCategories, listPublished, listVendors } from "@/lib/market/store";
import { marketPartners } from "@/lib/market/partners";
import { getCovers } from "@/lib/covers";
import { SiteFooter } from "@/components/site-footer";
import { BoxIcon, CartCount, CartIcon, LINE, RED_GRAD } from "../products/m-kit";
import { MarketBanner, MarketShop } from "./market-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mister Bamrungsuk — Marketplace โรงแรม · สปา · สินค้า" };

const FALLBACK = ["/brand/hotel1.jpg", "/brand/venue.jpg", "/brand/hotel2.jpg", "/brand/venue.jpg"];
const TRUST = ["ของแท้", "มี อย.", "นำเข้าถูกต้อง", "ร้านตรวจสอบแล้ว"];

// หน้าแรก Marketplace (ตามบอร์ด Market) — hero + แบนเนอร์ + โรงแรม/สปาพาร์ทเนอร์ + สินค้าคัดสรร + สมัครพาร์ทเนอร์
export default async function MarketHome() {
  const [products, vendors, partners, banners, categories] = await Promise.all([listPublished(), listVendors(), marketPartners(), activeBanners(), listCategories()]);
  // รูปจากแอดมิน "รูปหน้าปก": แบนเนอร์ แทนรูปของแบนเนอร์ตามลำดับ (ข้อความ/ลิงก์คงเดิม) · รูปเกินจำนวนแบนเนอร์ = แบนเนอร์รูปล้วน
  const [heroImgs, bannerImgs] = await Promise.all([getCovers("market_hero"), getCovers("market_banner")]);
  const hero = heroImgs[0] || "/brand/venue.jpg";
  const slides = (bannerImgs.length
    ? bannerImgs.map((image, k) => (banners[k] ? { ...banners[k], image } : { id: "cover-" + k, title: "", subtitle: "", image, link: "", sort: k, active: true }))
      .concat(banners.slice(bannerImgs.length))
    : banners);
  const rows = [...products].reverse().map((p) => {
    const v = vendors.find((x) => x.id === p.vendor_id);
    return { ...p, vendor_name: v?.name ?? "", vendor_slug: v?.slug ?? "", kind: categories.find((c) => c.id === p.category_id)?.name ?? "" };
  });
  const firstVendor = vendors.find((v) => products.some((p) => p.vendor_id === v.id));
  const img = (cover: string | undefined, k: number) => cover || FALLBACK[k % FALLBACK.length];
  const ql = "lux-card min-h-11 grid place-items-center rounded-xl border bg-[#241717] text-[#f6efe4] text-[12.5px] font-semibold text-center";
  const sec = (eb: string, title: string, href: string) => (
    <div className="flex justify-between items-end mx-[18px] mt-[22px] mb-2.5">
      <div><p className="text-[10.5px] tracking-[2.5px] text-[#f0c75a] font-semibold">{eb}</p><h2 className="font-lux font-semibold text-[18px] mt-0.5">{title}</h2></div>
      <Link href={href} className="text-[12.5px] text-[#ffd76a] min-h-8 inline-flex items-center">ดูทั้งหมด →</Link>
    </div>
  );
  const circle = "relative w-11 h-11 rounded-full border border-[rgba(246,239,228,.3)] bg-black/40 grid place-items-center text-[#f6efe4]";

  return (
    <main className="font-lux-body w-full max-w-[480px] mx-auto min-h-dvh bg-[#0e0a0a] text-[#f6efe4] relative overflow-x-hidden pb-[84px]">
      <div className="relative h-[300px]">
        <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(14,10,10,.35) 0%, rgba(14,10,10,.6) 55%, #0e0a0a 100%)" }} />
        <div className="relative flex justify-between items-center px-[18px] py-4">
          <Link href="/" className="flex items-center gap-2.5"><img src="/brand/logo.png" alt="Mister Bamrungsuk" className="w-[46px] h-[46px] object-contain" /><span className="font-lux font-semibold text-base text-[#f0c75a]">Mister Bamrungsuk</span></Link>
          <div className="flex gap-2">
            <Link href="/orders/track" aria-label="ติดตามคำสั่งซื้อ" className={circle}><BoxIcon /></Link>
            <Link href="/cart" aria-label="ตะกร้าสินค้า" className={circle}><CartIcon /><CartCount /></Link>
          </div>
        </div>
        <div className="absolute left-[18px] right-[18px] bottom-3.5">
          <p className="text-[10.5px] tracking-[2.5px] text-[#ffd76a] font-semibold">เพื่อนกิน เพื่อนเที่ยว · MARKETPLACE</p>
          <h1 className="mt-1.5 mb-1 font-lux font-bold text-[28px] leading-[1.15]">โรงแรม สปา และของดี<br />ที่เราคัดมาให้</h1>
          <p className="mb-3 text-[13px] text-[#d3c7bc]">พาร์ทเนอร์ที่ทำงานร่วมกับ Mister Bamrungsuk</p>
          <div className="flex gap-2.5">
            <Link href="/home" className="btn-red-lux flex-1 h-12 rounded-[14px] border grid place-items-center text-white font-lux font-semibold text-[15px]" style={{ background: RED_GRAD, borderColor: "rgba(245,210,110,.85)" }}>หาเพื่อน</Link>
            <Link href="/join" className="flex-1 h-12 rounded-[14px] border border-[#f0c75a] bg-[rgba(14,10,10,.6)] grid place-items-center text-[#ffd76a] font-lux font-semibold text-[15px]">สมัคร Part-Time</Link>
          </div>
        </div>
      </div>

      {slides.length > 0 && <MarketBanner banners={slides} fallback={FALLBACK} />}

      <div className="mx-[18px] mt-3 grid grid-cols-4 gap-1.5">
        {TRUST.map((t) => (
          <div key={t} className="flex flex-col items-center gap-1 px-1 py-2 rounded-xl bg-[#241717] border text-[#7fd6a3] text-center" style={{ borderColor: LINE }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
            <span className="text-[10.5px] text-[#d3c7bc] leading-tight">{t}</span>
          </div>
        ))}
      </div>
      <div className="mx-[18px] mt-2 flex gap-2.5 items-center px-3 py-2.5 rounded-[14px] bg-[#1d1712] border border-[rgba(227,195,92,.35)]">
        <span className="text-[#ffd76a]"><BoxIcon /></span>
        <p className="text-xs text-[#d3c7bc] leading-normal"><b className="text-[#ffd76a]">แพ็กมิดชิดทุกออเดอร์</b> · กล่องสีพื้น ไม่ระบุชื่อสินค้าหรือชื่อร้านบนหน้ากล่อง</p>
      </div>

      <nav className="mx-[18px] mt-3.5 grid grid-cols-3 gap-2" aria-label="เมนู Marketplace">
        <Link href="/hotels" className={ql} style={{ borderColor: LINE }}>โรงแรม</Link>
        <Link href="/spas" className={ql} style={{ borderColor: LINE }}>สปา</Link>
        <Link href="/products" className={ql} style={{ borderColor: LINE }}>สินค้าทั้งหมด</Link>
        <Link href={firstVendor ? `/shop/${firstVendor.slug || firstVendor.id}` : "/products"} className={ql} style={{ borderColor: LINE }}>ร้านแนะนำ</Link>
        <Link href="/orders/track" className={ql} style={{ borderColor: LINE }}>ติดตามคำสั่งซื้อ</Link>
        <Link href="/policy" className={ql} style={{ borderColor: LINE }}>นโยบายร้าน</Link>
      </nav>

      {partners.hotels.length > 0 && (
        <>
          {sec("HOTEL PARTNERS", "โรงแรมพาร์ทเนอร์", "/hotels")}
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-[18px]">
            {partners.hotels.map((h, k) => (
              <Link key={h.id} href={`/hotels/${h.id}`} className="lux-card shrink-0 w-[220px] rounded-2xl overflow-hidden bg-[#241717] border text-[#f6efe4]" style={{ borderColor: LINE }}>
                <img src={img(h.cover, k)} alt={h.name} className="w-full h-[120px] object-cover block" />
                <div className="px-3 py-2.5"><div className="font-lux font-semibold text-sm">{h.name}</div><div className="text-xs text-[#cdbfb3]">{h.area}</div><div className="text-xs text-[#ffd76a] mt-1">ส่วนลดสมาชิก [รอกำหนด]</div></div>
              </Link>
            ))}
          </div>
        </>
      )}

      {partners.spas.length > 0 && (
        <>
          {sec("SPA PARTNERS", "สปาพาร์ทเนอร์", "/spas")}
          <div className="flex flex-col gap-2.5 px-[18px]">
            {partners.spas.slice(0, 3).map((s, k) => (
              <Link key={s.id} href={`/spas/${s.id}`} className="lux-card flex gap-3 p-2.5 rounded-2xl bg-[#241717] border text-[#f6efe4]" style={{ borderColor: LINE }}>
                <img src={img(s.cover, k + 1)} alt={s.name} className="w-[76px] h-[76px] rounded-xl object-cover shrink-0" />
                <div className="min-w-0">
                  <div className="font-lux font-semibold text-[14.5px]">{s.name}</div>
                  <div className="text-xs text-[#cdbfb3]">{s.type} · {s.area}</div>
                  <div className="mt-1.5"><span className="inline-flex items-center gap-[5px] px-[9px] py-[3px] rounded-full border border-[rgba(212,175,55,.55)] bg-[rgba(240,200,90,.18)] text-[#ffd76a] text-[11px] font-semibold"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="m5 12 5 5 9-10" /></svg>ทำงานร่วมกับ Mister Bamrungsuk</span></div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
      {(partners.hotels.some((r) => r.sample) || partners.spas.some((r) => r.sample)) && <p className="text-[11px] text-[#7d6d6a] mx-[18px] mt-2">* ข้อมูลตัวอย่าง รอรายชื่อพาร์ทเนอร์จริง</p>}

      {sec("SHOP", "สินค้าคัดสรร", "/products")}
      <MarketShop products={rows} categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))} />

      <div className="mx-[18px] mt-[22px] p-[18px] rounded-[18px] border" style={{ borderColor: "rgba(245,210,110,.85)", background: "linear-gradient(135deg, #2a1418, #241717)" }}>
        <p className="text-[10.5px] tracking-[2.5px] text-[#f0c75a] font-semibold">BECOME A PARTNER</p>
        <h2 className="font-lux font-semibold text-[18px] my-1">โรงแรม สปา หรือแบรนด์สินค้า<br />อยากร่วมงานกับเรา?</h2>
        <p className="mb-3 text-[12.5px] text-[#cdbfb3]">ลงร้านบน Marketplace รับลูกค้าจากสมาชิกของเรา</p>
        <Link href="/partner" className="btn-red-lux grid place-items-center h-12 rounded-[14px] border text-white font-lux font-semibold" style={{ background: RED_GRAD, borderColor: "rgba(245,210,110,.85)" }}>สมัครเป็นพาร์ทเนอร์</Link>
        <Link href="/vendor" className="block text-center text-[12.5px] pt-3 text-[#ffd76a]">เป็นร้านค้าอยู่แล้ว? เข้าพอร์ทัลร้านค้า →</Link>
      </div>

      <div className="mx-[18px] mt-[22px] pt-4 border-t text-xs text-[#7d6d6a] leading-[1.7]" style={{ borderColor: LINE }}>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 mb-2 [&_a]:text-[#ffd76a]">
          <Link href="/policy/returns">นโยบายคืนสินค้า</Link><Link href="/policy/shipping">การจัดส่ง</Link><Link href="/policy/privacy-shop">ความเป็นส่วนตัว</Link><Link href="/join/terms">ข้อกำหนดการใช้งาน</Link><Link href="/orders/track">ติดตามคำสั่งซื้อ</Link>
        </div>
        ผลิตภัณฑ์เสริมอาหารไม่มีผลในการป้องกันหรือรักษาโรค · จำหน่ายเฉพาะผู้มีอายุ 20 ปีขึ้นไป
      </div>
      <SiteFooter />
    </main>
  );
}
