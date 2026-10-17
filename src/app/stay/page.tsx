/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { marketPartners } from "@/lib/market/partners";
import { getCovers } from "@/lib/covers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LINE, RED_GRAD } from "../products/m-kit";

export const dynamic = "force-dynamic";
export const metadata = { title: "โรงแรม · สปาพาร์ทเนอร์ — Mister Bamrungsuk" };

const FALLBACK = ["/brand/hotel1.jpg", "/brand/venue.jpg", "/brand/hotel2.jpg", "/brand/venue.jpg"];

// โรงแรม · สปาพาร์ทเนอร์ — แยกจากร้านค้า (Marketplace = สินค้าอย่างเดียว)
export default async function StayHome() {
  const [partners, heroImgs] = await Promise.all([marketPartners(), getCovers("market_hero")]);
  const hero = heroImgs[0] || "/brand/venue.jpg";
  const img = (cover: string | undefined, k: number) => cover || FALLBACK[k % FALLBACK.length];
  const sec = (eb: string, title: string, href: string) => (
    <div className="flex justify-between items-end mx-[18px] mt-[22px] mb-2.5">
      <div><p className="text-[11.5px] tracking-[2.5px] text-[#e8c472] font-semibold">{eb}</p><h2 className="font-lux font-semibold text-[18px] mt-0.5">{title}</h2></div>
      <Link href={href} className="text-[12.5px] text-[#e8c472] min-h-8 inline-flex items-center">ดูทั้งหมด →</Link>
    </div>
  );
  const tab = "lux-card min-h-12 grid place-items-center rounded-xl border bg-[#211a18] text-[#f3ead9] text-[14px] font-semibold text-center";

  return (
    <main className="mb-v7 mb-c w-full max-w-[480px] md:max-w-[760px] lg:max-w-[1120px] mx-auto min-h-dvh bg-[#171211] text-[#f3ead9] relative overflow-x-hidden">
      <SiteHeader />
      <div className="relative h-[240px] lg:h-[340px] mx-[18px] rounded-[18px] overflow-hidden border" style={{ borderColor: LINE }}>
        <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(14,10,10,.2) 0%, rgba(14,10,10,.55) 50%, rgba(14,10,10,.92) 100%)" }} />
        <div className="absolute left-4 right-4 bottom-4 lg:left-8 lg:bottom-8 lg:max-w-[560px]">
          <p className="text-[11.5px] tracking-[2.5px] text-[#e8c472] font-semibold">HOTEL · SPA PARTNERS</p>
          <h1 className="mt-1 mb-1 font-lux font-bold text-[26px] lg:text-[34px] leading-[1.3]">โรงแรม · สปา ราคาสมาชิก</h1>
          <p className="m-0 text-[13.5px] text-[#d9c9b4]">พาร์ทเนอร์ที่ทำงานร่วมกับ Mister Bamrungsuk</p>
        </div>
      </div>

      <nav className="mx-[18px] mt-3.5 grid grid-cols-2 gap-2" aria-label="เลือกประเภท">
        <Link href="/hotels" className={tab} style={{ borderColor: LINE }}>โรงแรมทั้งหมด</Link>
        <Link href="/spas" className={tab} style={{ borderColor: LINE }}>สปาทั้งหมด</Link>
      </nav>

      {partners.hotels.length > 0 && (
        <>
          {sec("HOTEL PARTNERS", "โรงแรมพาร์ทเนอร์", "/hotels")}
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-[18px] lg:grid lg:grid-cols-3 lg:overflow-visible">
            {partners.hotels.map((h, k) => (
              <Link key={h.id} href={`/hotels/${h.id}`} className="lux-card shrink-0 w-[220px] lg:w-auto rounded-2xl overflow-hidden bg-[#211a18] border text-[#f3ead9]" style={{ borderColor: LINE }}>
                <img src={img(h.cover, k)} alt={h.name} className="w-full h-[120px] lg:h-[180px] object-cover block" />
                <div className="px-3 py-2.5"><div className="font-lux font-semibold text-sm">{h.name}</div><div className="text-xs text-[#d9c9b4]">{h.area}</div><div className="text-xs text-[#e8c472] mt-1">ส่วนลดสมาชิก [รอกำหนด]</div></div>
              </Link>
            ))}
          </div>
        </>
      )}

      {partners.spas.length > 0 && (
        <>
          {sec("SPA PARTNERS", "สปาพาร์ทเนอร์", "/spas")}
          <div className="flex flex-col gap-2.5 px-[18px] md:grid md:grid-cols-2 lg:grid-cols-3">
            {partners.spas.slice(0, 6).map((s, k) => (
              <Link key={s.id} href={`/spas/${s.id}`} className="lux-card flex gap-3 p-2.5 rounded-2xl bg-[#211a18] border text-[#f3ead9]" style={{ borderColor: LINE }}>
                <img src={img(s.cover, k + 1)} alt={s.name} className="w-[76px] h-[76px] rounded-xl object-cover shrink-0" />
                <div className="min-w-0">
                  <div className="font-lux font-semibold text-[14.5px]">{s.name}</div>
                  <div className="text-xs text-[#d9c9b4]">{s.type} · {s.area}</div>
                  <div className="mt-1.5"><span className="inline-flex items-center gap-[5px] px-[9px] py-[3px] rounded-full border border-[rgba(212,175,55,.55)] bg-[rgba(232,196,114,.18)] text-[#e8c472] text-[11px] font-semibold"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="m5 12 5 5 9-10" /></svg>ทำงานร่วมกับ Mister Bamrungsuk</span></div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
      {(partners.hotels.some((r) => r.sample) || partners.spas.some((r) => r.sample)) && <p className="text-[11px] text-[#b5a596] mx-[18px] mt-2">* ข้อมูลตัวอย่าง รอรายชื่อพาร์ทเนอร์จริง</p>}

      <div className="mx-[18px] mt-[22px] mb-6 p-[18px] rounded-[18px] border" style={{ borderColor: "rgba(232,196,114,.55)", background: "linear-gradient(135deg, #2a1418, #211a18)" }}>
        <p className="text-[11.5px] tracking-[2.5px] text-[#e8c472] font-semibold">BECOME A PARTNER</p>
        <h2 className="font-lux font-semibold text-[18px] my-1">โรงแรมหรือสปา อยากร่วมงานกับเรา?</h2>
        <p className="mb-3 text-[12.5px] text-[#d9c9b4]">รับลูกค้าจากสมาชิกของเรา</p>
        <Link href="/partner" className="btn-red-lux grid place-items-center h-12 rounded-[14px] border text-white font-lux font-semibold" style={{ background: RED_GRAD, borderColor: "rgba(232,196,114,.55)" }}>สมัครเป็นพาร์ทเนอร์</Link>
      </div>
      <SiteFooter />
    </main>
  );
}
