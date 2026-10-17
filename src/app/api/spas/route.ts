import { NextResponse } from "next/server";
import { bookableSpas } from "@/lib/market/partners";
import type { PartnerSpa } from "@/lib/booking";

// รายชื่อสปาพาร์ทเนอร์ที่เปิดแสดงอยู่ (ทุกประเภทสปา: เดย์สปา/สปาเพื่อสุขภาพ/ร้านนวด ฯลฯ · ผ่าน QC แล้ว) — ถ้ายังไม่มี ใช้ข้อมูลตัวอย่าง
// price = ราคาเริ่มต้นของบริการ (บาท) · services = รายการให้ลูกค้าเลือกตอนจอง
export const dynamic = "force-dynamic";

export async function GET() {
  const all = await bookableSpas().catch(() => []);
  const sample = all.some((s) => s.sample);
  const spas: (PartnerSpa & { services: typeof all[number]["services"]; img: string | null; label: string })[] = all.map((s) => ({
    id: s.id, name: s.name, area: s.area, km: null, rating: null, label: s.label, img: s.img,
    price: s.services.length ? Math.min(...s.services.map((x) => x.price)) : 0, services: s.services,
  }));
  return NextResponse.json({ spas, sample });
}
