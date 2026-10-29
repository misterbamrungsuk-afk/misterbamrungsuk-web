import { PEOPLE, priceOf } from "@/lib/home/people";
import { myBlocked } from "@/lib/customer/profile";
import { getLivePeople } from "@/lib/home/live";
import { coordsOf, jitter, jitterSmall } from "@/lib/home/geo";
import { listPartners, stripSecret } from "@/lib/partner/store";
import { PARTNER_SPAS } from "@/lib/booking";
import { isPublicPartner, isSpaType } from "@/lib/partner/kind";
import { MapView, type MapPerson, type MapVenue } from "./view";
import { PT_ONLY } from "@/lib/site-gate";
import { PreviewBanner } from "@/components/preview-banner";

export const dynamic = "force-dynamic";
import { getLang, getSite } from "@/i18n/server";
import { autoTranslate } from "@/lib/i18n/auto-translate";

export async function generateMetadata() { return { title: (await getSite()).map.metaTitle }; }

// บอร์ด C-Map — หมุดเพื่อน (รูปโปรไฟล์ · ตำแหน่งตามย่านที่แจ้ง ไม่ใช่ตำแหน่งจริง) + หมุดสปาพาร์ทเนอร์ · Part-Time จริงถ้ามี ไม่งั้นตัวอย่าง
export default async function MapPage() {
  const [all, blocked] = await Promise.all([getLivePeople().catch(() => []), myBlocked()]);
  const lang = await getLang();
  const tr = lang === "th" ? null : await autoTranslate(lang, all.map((p) => ({ kind: "name" as const, text: p.nick })));
  const live = all.filter((p) => !blocked.has(p.id)).map((p) => (tr ? { ...p, nick: tr("name", p.nick) } : p));
  const people: MapPerson[] = (live.length ? live : PEOPLE).map((p) => {
    const [lat, lng] = p.geo ? jitterSmall(p.geo, p.id) : jitter(coordsOf(p.prov, p.area), p.id);
    return { id: p.id, nick: p.nick, age: p.age, img: p.img, pos: p.pos, rating: p.rating, top: p.top, acts: p.acts, area: p.prov ? `${p.area} · ${p.prov}` : p.area, price: priceOf(p), ...(p.priceTBD ? { priceTBD: true } : {}), free: p.free, lat, lng, real: !!p.real };
  });
  let venues: MapVenue[] = [];
  try {
    venues = (await listPartners()).map(stripSecret).filter((v) => isSpaType(v.type) && isPublicPartner(v))
      .map((v) => { const [lat, lng] = jitter(coordsOf(v.province), v.id); return { id: v.id, name: v.business_name, area: v.province, lat, lng }; });
  } catch { venues = []; }
  if (!venues.length) venues = PARTNER_SPAS.map((v) => { const [lat, lng] = jitter(coordsOf(v.area), v.id); return { id: v.id, name: v.name, area: v.area, lat, lng, sample: true }; });
  return <>{PT_ONLY && <PreviewBanner offset={160} />}<MapView people={people} venues={venues} sample={!live.length} /></>;
}
