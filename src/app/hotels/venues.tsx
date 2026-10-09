import { notFound } from "next/navigation";
import { partnerDetail, partnerDetails, type PartnerDetail, type PartnerKind } from "@/lib/market/partners";
import { VenueListView, VenueDetailView, type VenueCard, type VenueFull } from "./venue-client";

// หน้ารายการ / รายละเอียด โรงแรม-สปาพาร์ทเนอร์ — ตามบอร์ด HotelList/SpaList/HotelDetail/SpaDetail (.dc.html)
const FALLBACK: Record<PartnerKind, string[]> = {
  "โรงแรม": ["/brand/cover.jpg", "/brand/cover2.jpg", "/brand/spa.jpg"],
  "สปา": ["/brand/spa.jpg", "/brand/cover2.jpg", "/brand/cover.jpg"],
};

const fromPrice = (p: PartnerDetail) => (p.services.length ? Math.min(...p.services.map((s) => s.platform_price ?? s.base_price)) : null);

function card(p: PartnerDetail, i: number): VenueCard {
  const fb = FALLBACK[p.type];
  return {
    id: p.id, name: p.name, province: p.province, area: p.area, sample: !!p.sample,
    img: p.cover || p.gallery[0] || fb[i % fb.length],
    tags: p.amenities.slice(0, 2).join(" · "), price: fromPrice(p),
  };
}

export async function VenueList({ type }: { type: PartnerKind; province?: string }) {
  const all = await partnerDetails(type);
  return <VenueListView type={type} items={all.map(card)} />;
}

export async function VenueDetail({ type, id }: { type: PartnerKind; id: string }) {
  const p = await partnerDetail(type, id);
  if (!p) notFound();
  const tel = p.tel.replace(/[^\d+]/g, "");
  const line = p.line_id ? `https://line.me/R/ti/p/${encodeURIComponent(p.line_id.startsWith("@") ? p.line_id : `~${p.line_id}`)}` : "";
  const facts = [p.hours || (type === "สปา" ? "เวลาเปิด [รอกำหนด]" : "เช็กอิน/เช็กเอาต์ [รอกำหนด]"), p.amenities.join(" · "), "ส่วนลดสมาชิก [รอกำหนด]"].filter(Boolean);
  const v: VenueFull = {
    id: p.id, name: p.name, type, province: p.province, area: p.area, sample: !!p.sample, description: p.description,
    gallery: p.gallery.length ? p.gallery : FALLBACK[type],
    facts,
    services: p.services.map((s) => ({ name: s.name, desc: s.minutes >= 600 ? "ค้างคืน" : `${s.minutes} นาที`, price: s.platform_price ?? s.base_price, base: s.base_price })),
    tel, telLabel: p.tel, line,
    map: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name.replace(/\(ตัวอย่าง\)/, "").trim()} ${p.area} ${p.province}`)}`,
  };
  return <VenueDetailView v={v} />;
}
