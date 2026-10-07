import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublished } from "@/lib/market/store";
import { baht } from "@/lib/market/config";
import { partnerDetail, partnerDetails, type PartnerDetail, type PartnerKind } from "@/lib/market/partners";
import { MarketHeader } from "../products/market-ui";
import { MarketFooter, SectionHead, TrustBar } from "../products/market-bits";
import { ProductCard } from "../products/product-card";
import { MeetHere } from "./meet-here";

const META: Record<PartnerKind, { base: string; eyebrow: string; title: string; sub: string; kind: "spa" | "hotel" }> = {
  "โรงแรม": { base: "/hotels", eyebrow: "HOTELS", title: "โรงแรมพาร์ทเนอร์", sub: "ห้องพักที่ผ่านมาตรฐาน Mister Bamrungsuk", kind: "hotel" },
  "สปา": { base: "/spas", eyebrow: "SPAS", title: "สปาพาร์ทเนอร์", sub: "สปาและห้องส่วนตัวที่ผ่านมาตรฐาน Mister Bamrungsuk", kind: "spa" },
};

const Badge = () => <span className="inline-flex items-center h-7 px-3 rounded-full border border-gold-500/60 text-gold-300 text-[11px] font-semibold">ทำงานร่วมกับ Mister Bamrungsuk</span>;

function Cover({ p, className = "" }: { p: PartnerDetail; className?: string }) {
  return p.cover
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={p.cover} alt={p.name} className={`object-cover ${className}`} />
    : <div className={`grid place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(212,175,55,0.22),transparent_60%),linear-gradient(135deg,#2a1414,#120c0c)] font-display text-4xl text-gold-300 ${className}`}>{p.name.slice(0, 1)}</div>;
}

const fromPrice = (p: PartnerDetail) => (p.services.length ? Math.min(...p.services.map((s) => s.platform_price ?? s.base_price)) : null);

export async function VenueList({ type, province }: { type: PartnerKind; province?: string }) {
  const m = META[type];
  const all = await partnerDetails(type);
  const provinces = [...new Set(all.map((p) => p.province).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));
  const rows = province ? all.filter((p) => p.province === province) : all;
  return (
    <main className="min-h-dvh bg-ink-900 text-ink-100">
      <MarketHeader />
      <section className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-gold-500">{m.eyebrow}</p>
        <h1 className="text-3xl font-semibold mt-1">{m.title}</h1>
        <p className="text-ink-300 text-sm mt-1">{m.sub}</p>
        <nav className="flex flex-wrap gap-2 mt-5" aria-label="กรองตามจังหวัด">
          <Link href={m.base} className={`chip h-9 px-3.5 ${!province ? "chip-red" : ""}`}>ทุกจังหวัด</Link>
          {provinces.map((pv) => <Link key={pv} href={`${m.base}?province=${encodeURIComponent(pv)}`} className={`chip h-9 px-3.5 ${province === pv ? "chip-red" : ""}`}>{pv}</Link>)}
        </nav>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {rows.map((p) => (
            <Link key={p.id} href={`${m.base}/${p.id}`} className="glass glass-hover rounded-3xl overflow-hidden flex flex-col">
              <Cover p={p} className="w-full aspect-[16/10]" />
              <div className="p-4 flex flex-col gap-2">
                <p className="font-semibold leading-snug">{p.name}</p>
                <p className="text-xs text-ink-300">{p.area} · {p.province}</p>
                {fromPrice(p) != null && <p className="text-xs text-ink-200">เริ่มต้น ฿{baht(fromPrice(p)!)}</p>}
                <div className="mt-1"><Badge /></div>
              </div>
            </Link>
          ))}
        </div>
        {!rows.length && <p className="text-sm text-ink-300 mt-6">ยังไม่มีพาร์ทเนอร์ในจังหวัดนี้</p>}
        {rows.some((r) => r.sample) && <p className="text-[11px] text-ink-400 mt-3">* ข้อมูลตัวอย่าง รอรายชื่อพาร์ทเนอร์จริง</p>}
      </section>
      <MarketFooter />
    </main>
  );
}

export async function VenueDetail({ type, id }: { type: PartnerKind; id: string }) {
  const m = META[type];
  const p = await partnerDetail(type, id);
  if (!p) notFound();
  const products = (await listPublished().catch(() => [])).slice(0, 3);
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name.replace(/\(ตัวอย่าง\)/, "").trim()} ${p.area} ${p.province}`)}`;
  const line = p.line_id ? `https://line.me/R/ti/p/${encodeURIComponent(p.line_id.startsWith("@") ? p.line_id : `~${p.line_id}`)}` : "";
  const tel = p.tel.replace(/[^\d+]/g, "");
  return (
    <main className="min-h-dvh bg-ink-900 text-ink-100">
      <MarketHeader />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href={m.base} className="text-sm text-ink-300 hover:text-gold-300">← {m.title}ทั้งหมด</Link>
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 mt-4">
          <div className="flex flex-col gap-3">
            <Cover p={p} className="w-full aspect-[4/3] rounded-3xl" />
            {p.gallery.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.gallery.slice(1, 9).map((src) => <img key={src} src={src} alt="" className="aspect-square rounded-xl object-cover" />)}
              </div>
            )}
          </div>
          <div>
            <Badge />
            <h1 className="text-2xl lg:text-3xl font-semibold mt-3">{p.name}</h1>
            <p className="text-sm text-ink-300 mt-1">{type} · {p.area} · {p.province}</p>
            {p.hours && <p className="text-xs text-ink-400 mt-1">{p.hours}</p>}
            {p.description && <p className="mt-4 text-ink-200 leading-relaxed whitespace-pre-line">{p.description}</p>}
            <div className="flex flex-wrap gap-3 mt-6">
              <MeetHere place={{ kind: m.kind, id: p.id, name: p.name, area: p.area }} />
              {line ? <a href={line} target="_blank" rel="noreferrer" className="btn-ghost h-12 px-6 rounded-full inline-flex items-center">ติดต่อ/จอง ทาง LINE</a>
                : tel ? <a href={`tel:${tel}`} className="btn-ghost h-12 px-6 rounded-full inline-flex items-center">ติดต่อ/จอง {p.tel}</a>
                : <span className="btn-ghost h-12 px-6 rounded-full inline-flex items-center opacity-60">ติดต่อ/จอง [รอกำหนด]</span>}
            </div>
            {line && tel && <a href={`tel:${tel}`} className="block text-sm text-ink-300 mt-2 hover:text-gold-300">โทร {p.tel}</a>}
            <a href={map} target="_blank" rel="noreferrer" className="inline-block text-sm text-gold-300 mt-3 hover:underline">ดูแผนที่ (Google Maps) ↗</a>
            {p.amenities.length > 0 && (
              <ul className="flex flex-wrap gap-2 mt-5">{p.amenities.map((a) => <li key={a} className="chip h-8 px-3 text-xs">{a}</li>)}</ul>
            )}
          </div>
        </div>

        <section className="mt-10">
          <SectionHead eyebrow="SERVICES" title={type === "สปา" ? "บริการและราคา" : "ห้องพักและราคา"} />
          {p.services.length ? (
            <ul className="glass rounded-3xl divide-y divide-ink-600">
              {p.services.map((s) => (
                <li key={s.name} className="flex items-center gap-3 px-5 py-4">
                  <div className="flex-1"><p className="font-medium">{s.name}</p><p className="text-xs text-ink-300">{s.minutes >= 600 ? "ค้างคืน" : `${s.minutes} นาที`}</p></div>
                  <div className="text-right">
                    {s.platform_price != null && s.platform_price < s.base_price && <p className="text-xs text-ink-400 line-through">฿{baht(s.base_price)}</p>}
                    <p className="font-display text-lg font-bold text-gold-300">฿{baht(s.platform_price ?? s.base_price)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-300">ราคา [รอกำหนด] — สอบถามสถานที่โดยตรง</p>}
          {p.sample && <p className="text-[11px] text-ink-400 mt-2">* ข้อมูลตัวอย่าง</p>}
        </section>

        {products.length > 0 && (
          <section className="mt-10">
            <SectionHead eyebrow="SHOP" title="ช้อปสินค้าคัดสรรก่อนไป" sub="สินค้าจากร้านค้าพาร์ทเนอร์ ทุกรายการมีเลข อย." right={<Link href="/products" className="text-sm text-gold-300 hover:underline">ดูทั้งหมด →</Link>} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{products.map((x) => <ProductCard key={x.id} p={x} />)}</div>
          </section>
        )}
      </div>
      <TrustBar className="mt-6" />
      <MarketFooter />
    </main>
  );
}
