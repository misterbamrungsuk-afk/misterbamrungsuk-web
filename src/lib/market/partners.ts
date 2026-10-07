import "server-only";
import { listPartners } from "@/lib/partner/store";

export interface MarketPartner { id: string; name: string; type: "โรงแรม" | "สปา"; area: string; sample?: boolean }

const SAMPLE: MarketPartner[] = [
  { id: "h1", name: "The Siam Riverside (ตัวอย่าง)", type: "โรงแรม", area: "เจริญกรุง", sample: true },
  { id: "h2", name: "Sukhumvit Grand Suites (ตัวอย่าง)", type: "โรงแรม", area: "สุขุมวิท", sample: true },
  { id: "s1", name: "Lumière Private Spa (ตัวอย่าง)", type: "สปา", area: "สุขุมวิท 24", sample: true },
  { id: "s2", name: "The Velvet Room (ตัวอย่าง)", type: "สปา", area: "ทองหล่อ", sample: true },
  { id: "s3", name: "Sathorn Retreat (ตัวอย่าง)", type: "สปา", area: "สาทร", sample: true },
];

/** พาร์ทเนอร์ที่ active (โรงแรม / สปา) — ประเภทไหนยังไม่มีข้อมูลจริง ใช้ตัวอย่างแทน (แบบ /api/spas) */
export async function marketPartners(): Promise<{ hotels: MarketPartner[]; spas: MarketPartner[] }> {
  let real: MarketPartner[] = [];
  try {
    real = (await listPartners())
      .filter((p) => (p.type === "โรงแรม" || p.type === "สปา") && (p.account_status === "active" || p.status === "active"))
      .map((p) => ({ id: p.id, name: p.business_name, type: p.type as MarketPartner["type"], area: p.province }));
  } catch { real = []; }
  const pick = (t: MarketPartner["type"]) => {
    const r = real.filter((p) => p.type === t);
    return r.length ? r : SAMPLE.filter((p) => p.type === t);
  };
  return { hotels: pick("โรงแรม"), spas: pick("สปา") };
}
