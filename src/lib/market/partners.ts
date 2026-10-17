import "server-only";
import { listPartners, type Partner } from "@/lib/partner/store";
import { getListing } from "@/lib/partner/portal";
import { fileUrl, serviceId, servicePrice, type Listing, type ServiceItem } from "@/lib/partner/portal-types";
import { isPublicPartner, venueKind } from "@/lib/partner/kind";
import { PARTNER_SPAS } from "@/lib/booking";
import { publicLogo, type Logo } from "@/lib/avatar";

export type PartnerKind = "โรงแรม" | "สปา";
/** label = ประเภทจริงที่พาร์ทเนอร์ใช้ (เช่น "เดย์สปา") · type = กลุ่มที่ใช้แยกหน้า (สปา/โรงแรม) */
export interface MarketPartner { id: string; name: string; type: PartnerKind; label: string; area: string; sample?: boolean; cover?: string }
export interface PartnerDetail extends MarketPartner {
  province: string; description: string; gallery: string[]; services: ServiceItem[]; amenities: string[];
  /** ช่องทางติดต่อสาธารณะจากหน้าร้าน (ไม่ใช่เบอร์ส่วนตัวผู้สมัคร) */
  tel: string; line_id: string; hours: string; address: string; map_url: string;
}

const svc = (name: string, minutes: number, price: number): ServiceItem => ({ name, minutes, base_price: price, platform_price: null });
const S = (x: Omit<PartnerDetail, "label" | "address" | "map_url" | "tel" | "line_id">): PartnerDetail => ({ ...x, label: x.type, address: "", map_url: "", tel: "", line_id: "" });
const SAMPLE: PartnerDetail[] = [
  S({ id: "h1", name: "The Siam Riverside (ตัวอย่าง)", type: "โรงแรม", area: "เจริญกรุง", province: "กรุงเทพมหานคร", sample: true, description: "โรงแรมริมแม่น้ำเจ้าพระยา ห้องพักกว้าง เงียบสงบ เดินทางสะดวก — ข้อมูลตัวอย่าง", gallery: [], services: [svc("ห้อง Deluxe (รายชั่วโมง)", 180, 1500), svc("ห้อง Suite (ค้างคืน)", 720, 4500)], amenities: ["ที่จอดรถ", "Wi-Fi"], hours: "เปิด 24 ชม." }),
  S({ id: "h2", name: "Sukhumvit Grand Suites (ตัวอย่าง)", type: "โรงแรม", area: "สุขุมวิท", province: "กรุงเทพมหานคร", sample: true, description: "ใจกลางสุขุมวิท ใกล้ BTS — ข้อมูลตัวอย่าง", gallery: [], services: [svc("ห้อง Superior", 180, 1200)], amenities: ["ที่จอดรถ", "Wi-Fi", "รองรับภาษาอังกฤษ"], hours: "เปิด 24 ชม." }),
  S({ id: "h3", name: "Pattaya Bay Residence (ตัวอย่าง)", type: "โรงแรม", area: "พัทยากลาง", province: "ชลบุรี", sample: true, description: "ใกล้ชายหาด บรรยากาศพักผ่อน — ข้อมูลตัวอย่าง", gallery: [], services: [svc("ห้อง Sea View", 720, 2800)], amenities: ["ที่จอดรถ"], hours: "เปิด 24 ชม." }),
  S({ id: "s1", name: "Lumière Private Spa (ตัวอย่าง)", type: "สปา", area: "สุขุมวิท 24", province: "กรุงเทพมหานคร", sample: true, description: "ห้องสปาส่วนตัว ตกแต่งโทนอบอุ่น — ข้อมูลตัวอย่าง", gallery: [], services: [svc("นวดน้ำมันอโรมา", 90, 1290), svc("ห้องส่วนตัว + อ่างจากุซซี่", 120, 1900)], amenities: ["ห้องอาบน้ำส่วนตัว", "อ่างจากุซซี่"], hours: "ทุกวัน 10:00–22:00" }),
  S({ id: "s2", name: "The Velvet Room (ตัวอย่าง)", type: "สปา", area: "ทองหล่อ", province: "กรุงเทพมหานคร", sample: true, description: "สปาบรรยากาศหรูย่านทองหล่อ — ข้อมูลตัวอย่าง", gallery: [], services: [svc("นวดไทยประยุกต์", 60, 890), svc("นวดน้ำมัน", 90, 1190)], amenities: ["ซาวน่า", "เครื่องดื่มต้อนรับ"], hours: "ทุกวัน 11:00–23:00" }),
  S({ id: "s3", name: "Sathorn Retreat (ตัวอย่าง)", type: "สปา", area: "สาทร", province: "กรุงเทพมหานคร", sample: true, description: "มุมพักผ่อนกลางเมือง — ข้อมูลตัวอย่าง", gallery: [], services: [svc("นวดเท้า", 60, 590)], amenities: ["ที่จอดรถ"], hours: "ทุกวัน 10:00–22:00" }),
  S({ id: "s4", name: "Nimman Garden Spa (ตัวอย่าง)", type: "สปา", area: "นิมมาน", province: "เชียงใหม่", sample: true, description: "สปาสวนสวย ย่านนิมมาน — ข้อมูลตัวอย่าง", gallery: [], services: [svc("นวดสมุนไพร", 90, 990)], amenities: ["ห้องพักรอ"], hours: "ทุกวัน 10:00–21:00" }),
];

const DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

/** เวลาเปิดแบบสั้น (พิลล์ไม่ล้นจอมือถือ): เวลาเดียวกันทุกวัน = "ทุกวัน 10:00–22:00" · ไม่งั้นรวมวันที่เวลาเดียวกัน "จ.–ศ. 10:00–22:00" */
export function compactHours(open: { day: number; from: string; to: string }[]): string {
  if (!open.length) return "";
  const groups = new Map<string, number[]>();
  for (const h of open) { const k = `${h.from}–${h.to}`; groups.set(k, [...(groups.get(k) ?? []), h.day]); }
  const days = (ds: number[]) => {
    if (ds.length === 7) return "ทุกวัน";
    const order = [1, 2, 3, 4, 5, 6, 0].filter((d) => ds.includes(d));
    const runs: number[][] = [];
    for (const d of order) { const last = runs[runs.length - 1]; const prev = last?.[last.length - 1]; if (last && [1, 2, 3, 4, 5, 6, 0].indexOf(d) === [1, 2, 3, 4, 5, 6, 0].indexOf(prev!) + 1) last.push(d); else runs.push([d]); }
    return runs.map((r) => (r.length > 2 ? `${DAYS[r[0]]}–${DAYS[r[r.length - 1]]}` : r.map((d) => DAYS[d]).join(" "))).join(" ");
  };
  return [...groups].map(([t, ds]) => `${days(ds)} ${t}`).join(" · ");
}

/** พาร์ทเนอร์จริงที่เปิดแสดง (ผ่าน QC + บัญชี active) พร้อมหน้าร้าน — กลุ่มจากประเภทพาร์ทเนอร์ ไม่ได้ = ประเภทหน้าร้าน */
export async function publicPartnerRows(): Promise<{ p: Partner; l: Listing | null; kind: PartnerKind }[]> {
  const rows = (await listPartners().catch(() => [] as Partner[])).filter(isPublicPartner);
  const out = await Promise.all(rows.map(async (p) => {
    const l = await getListing(p.id).catch(() => null);
    const kind = venueKind(p.type) ?? venueKind(l?.type);
    return kind ? { p, l, kind } : null;
  }));
  return out.filter((x): x is { p: Partner; l: Listing | null; kind: PartnerKind } => !!x);
}

async function realPartners(): Promise<PartnerDetail[]> {
  try {
    return (await publicPartnerRows()).map(({ p, l, kind }) => {
      const open = l?.hours?.filter((h) => h.open) ?? [];
      const c = l?.contact ?? {};
      return {
        id: p.id, name: p.business_name, type: kind, label: p.type || kind, area: l?.area || p.province, province: p.province,
        description: l?.description ?? "", cover: l?.cover ? fileUrl(l.cover) : undefined,
        gallery: [l?.cover, ...(l?.gallery ?? [])].filter((x): x is string => !!x).map((x) => fileUrl(x)),
        services: l?.services ?? [], amenities: l?.amenities ?? [],
        // ใช้เฉพาะช่องทางที่ร้านกรอกในหน้าร้าน — ไม่เปิดเบอร์ส่วนตัวจากใบสมัคร
        tel: String(c.phone ?? ""), line_id: String(c.line_id ?? ""), address: String(c.address ?? ""),
        map_url: String(c.map_url ?? "") || (c.lat != null && c.lng != null ? `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}` : ""),
        hours: compactHours(open),
      };
    });
  } catch { return []; }
}

/** พาร์ทเนอร์ที่เปิดแสดง (โรงแรม / สปา) — ประเภทไหนยังไม่มีข้อมูลจริง ใช้ตัวอย่างแทน (แบบ /api/spas) */
export async function partnerDetails(type?: PartnerKind): Promise<PartnerDetail[]> {
  const real = await realPartners();
  const pick = (t: PartnerKind) => { const r = real.filter((p) => p.type === t); return r.length ? r : SAMPLE.filter((p) => p.type === t); };
  return type ? pick(type) : [...pick("โรงแรม"), ...pick("สปา")];
}
export async function partnerDetail(type: PartnerKind, id: string) {
  return (await partnerDetails(type)).find((p) => p.id === id) ?? null;
}
export async function marketPartners(): Promise<{ hotels: MarketPartner[]; spas: MarketPartner[] }> {
  const [hotels, spas] = await Promise.all([partnerDetails("โรงแรม"), partnerDetails("สปา")]);
  return { hotels, spas };
}

// ── สปาที่จองได้ในหน้านัดเพื่อน (/book/[id]) + ตรวจบริการฝั่งเซิร์ฟเวอร์ (/api/bookings) ──
export type SpaService = { id: string; name: string; minutes: number; price: number };
export type BookableSpa = { id: string; name: string; area: string; label: string; img: string | null; logo: Logo | null; services: SpaService[]; sample?: boolean };

/** สปาจริงที่เปิดแสดง + บริการ (ราคา = ราคาแพลตฟอร์ม ?? ราคาฐาน) · ยังไม่มีสปาจริง = ตัวอย่าง (ค่าห้องตามตัวอย่าง) */
export async function bookableSpas(withLogo = false): Promise<BookableSpa[]> {
  const real = (await publicPartnerRows().catch(() => [])).filter((x) => x.kind === "สปา");
  if (!real.length) return PARTNER_SPAS.map((s) => ({ id: s.id, name: s.name, area: s.area, label: "สปา", img: null, logo: null, sample: true, services: [{ id: "room", name: "ค่าห้อง", minutes: 0, price: s.price }] }));
  return Promise.all(real.map(async ({ p, l }) => ({
    id: p.id, name: p.business_name, area: l?.area || p.province, label: p.type || "สปา",
    img: l?.cover ? fileUrl(l.cover) : l?.gallery?.[0] ? fileUrl(l.gallery[0]) : null,
    logo: withLogo ? await publicLogo("partner", p.id) : null,
    services: (l?.services ?? []).map((s, i) => ({ id: serviceId(s, i), name: s.name, minutes: s.minutes, price: servicePrice(s) })),
  })));
}
/** หาบริการที่ลูกค้าเลือก — ราคาจากหน้าร้านของสปาเสมอ (ไม่เชื่อราคาจากหน้าเว็บ) · สปาที่ไม่มีรายการบริการ = ค่าห้อง 0 */
export async function spaServiceFor(spaId: unknown, svcId: unknown): Promise<{ spa: BookableSpa | null; service: SpaService | null; ok: boolean }> {
  const spa = (await bookableSpas()).find((s) => s.id === spaId) ?? null;
  if (!spa) return { spa, service: null, ok: false };
  if (!spa.services.length) return { spa, service: null, ok: true };
  // ตัวอย่างมีบริการเดียว (ค่าห้อง) — ไม่ส่ง service_id มาก็ใช้ตัวนั้น
  const service = spa.services.find((s) => s.id === svcId) ?? (spa.sample && spa.services.length === 1 ? spa.services[0] : null);
  return { spa, service, ok: !!service };
}
