import "server-only";
import { listPartners } from "@/lib/partner/store";
import { getListing } from "@/lib/partner/portal";
import { fileUrl, type ServiceItem } from "@/lib/partner/portal-types";

export type PartnerKind = "โรงแรม" | "สปา";
export interface MarketPartner { id: string; name: string; type: PartnerKind; area: string; sample?: boolean; cover?: string }
export interface PartnerDetail extends MarketPartner {
  province: string; description: string; gallery: string[]; services: ServiceItem[]; amenities: string[];
  tel: string; line_id: string; hours: string;
}

const svc = (name: string, minutes: number, price: number): ServiceItem => ({ name, minutes, base_price: price, platform_price: null });
const SAMPLE: PartnerDetail[] = [
  { id: "h1", name: "The Siam Riverside (ตัวอย่าง)", type: "โรงแรม", area: "เจริญกรุง", province: "กรุงเทพมหานคร", sample: true, description: "โรงแรมริมแม่น้ำเจ้าพระยา ห้องพักกว้าง เงียบสงบ เดินทางสะดวก — ข้อมูลตัวอย่าง", gallery: [], services: [svc("ห้อง Deluxe (รายชั่วโมง)", 180, 1500), svc("ห้อง Suite (ค้างคืน)", 720, 4500)], amenities: ["ที่จอดรถ", "Wi-Fi"], tel: "", line_id: "", hours: "เปิด 24 ชม." },
  { id: "h2", name: "Sukhumvit Grand Suites (ตัวอย่าง)", type: "โรงแรม", area: "สุขุมวิท", province: "กรุงเทพมหานคร", sample: true, description: "ใจกลางสุขุมวิท ใกล้ BTS — ข้อมูลตัวอย่าง", gallery: [], services: [svc("ห้อง Superior", 180, 1200)], amenities: ["ที่จอดรถ", "Wi-Fi", "รองรับภาษาอังกฤษ"], tel: "", line_id: "", hours: "เปิด 24 ชม." },
  { id: "h3", name: "Pattaya Bay Residence (ตัวอย่าง)", type: "โรงแรม", area: "พัทยากลาง", province: "ชลบุรี", sample: true, description: "ใกล้ชายหาด บรรยากาศพักผ่อน — ข้อมูลตัวอย่าง", gallery: [], services: [svc("ห้อง Sea View", 720, 2800)], amenities: ["ที่จอดรถ"], tel: "", line_id: "", hours: "เปิด 24 ชม." },
  { id: "s1", name: "Lumière Private Spa (ตัวอย่าง)", type: "สปา", area: "สุขุมวิท 24", province: "กรุงเทพมหานคร", sample: true, description: "ห้องสปาส่วนตัว ตกแต่งโทนอบอุ่น — ข้อมูลตัวอย่าง", gallery: [], services: [svc("นวดน้ำมันอโรมา", 90, 1290), svc("ห้องส่วนตัว + อ่างจากุซซี่", 120, 1900)], amenities: ["ห้องอาบน้ำส่วนตัว", "อ่างจากุซซี่"], tel: "", line_id: "", hours: "ทุกวัน 10:00–22:00" },
  { id: "s2", name: "The Velvet Room (ตัวอย่าง)", type: "สปา", area: "ทองหล่อ", province: "กรุงเทพมหานคร", sample: true, description: "สปาบรรยากาศหรูย่านทองหล่อ — ข้อมูลตัวอย่าง", gallery: [], services: [svc("นวดไทยประยุกต์", 60, 890), svc("นวดน้ำมัน", 90, 1190)], amenities: ["ซาวน่า", "เครื่องดื่มต้อนรับ"], tel: "", line_id: "", hours: "ทุกวัน 11:00–23:00" },
  { id: "s3", name: "Sathorn Retreat (ตัวอย่าง)", type: "สปา", area: "สาทร", province: "กรุงเทพมหานคร", sample: true, description: "มุมพักผ่อนกลางเมือง — ข้อมูลตัวอย่าง", gallery: [], services: [svc("นวดเท้า", 60, 590)], amenities: ["ที่จอดรถ"], tel: "", line_id: "", hours: "ทุกวัน 10:00–22:00" },
  { id: "s4", name: "Nimman Garden Spa (ตัวอย่าง)", type: "สปา", area: "นิมมาน", province: "เชียงใหม่", sample: true, description: "สปาสวนสวย ย่านนิมมาน — ข้อมูลตัวอย่าง", gallery: [], services: [svc("นวดสมุนไพร", 90, 990)], amenities: ["ห้องพักรอ"], tel: "", line_id: "", hours: "ทุกวัน 10:00–21:00" },
];

const DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

async function realPartners(): Promise<PartnerDetail[]> {
  try {
    const rows = (await listPartners()).filter((p) => (p.type === "โรงแรม" || p.type === "สปา") && (p.account_status === "active" || p.status === "active"));
    return await Promise.all(rows.map(async (p) => {
      const l = await getListing(p.id).catch(() => null);
      const open = l?.hours?.filter((h) => h.open) ?? [];
      return {
        id: p.id, name: p.business_name, type: p.type as PartnerKind, area: l?.area || p.province, province: p.province,
        description: l?.description ?? "", cover: l?.cover ? fileUrl(l.cover) : undefined,
        gallery: [l?.cover, ...(l?.gallery ?? [])].filter((x): x is string => !!x).map(fileUrl),
        services: l?.services ?? [], amenities: l?.amenities ?? [], tel: p.tel ?? "", line_id: p.line_id ?? "",
        hours: open.length ? open.map((h) => `${DAYS[h.day]} ${h.from}–${h.to}`).join(" · ") : "",
      };
    }));
  } catch { return []; }
}

/** พาร์ทเนอร์ที่ active (โรงแรม / สปา) — ประเภทไหนยังไม่มีข้อมูลจริง ใช้ตัวอย่างแทน (แบบ /api/spas) */
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
