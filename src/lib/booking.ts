// ตัวช่วย flow จองล่วงหน้า (โหมดเดโม: คำนวณฝั่งหน้าเว็บ — โหมดจริงให้เซิร์ฟเวอร์คำนวณซ้ำก่อนสร้างออเดอร์)
import type { Post, PromoCode } from "./types";


/** วันให้เลือก 5 วันนับจากวันนี้ (yyyy-mm-dd ตามเวลาเครื่อง) */
export function nextDays(n = 5) {
  const out: { iso: string; dow: string; day: number }[] = [];
  const dows = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({ iso, dow: dows[d.getDay()], day: d.getDate() });
  }
  return out;
}

/** ช่วงเวลาตามเวลาว่างของ Part-Time ทุก 90 นาที; ช่องที่ถูกจองแล้วใช้ค่าสุ่มคงที่ตามวัน (เดโม) */
export function timeSlots(post: Post, dateIso: string) {
  const [startH, endH] = post.workingHours.split("-").map((t) => Number(t.split(":")[0]));
  const end = endH <= startH ? endH + 24 : endH;
  const seed = Number(dateIso.replaceAll("-", "")) + post.id.length;
  const slots: { time: string; taken: boolean }[] = [];
  let i = 0;
  for (let m = startH * 60; m + 60 <= end * 60; m += 90, i++) {
    const h = Math.floor(m / 60) % 24;
    slots.push({ time: `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`, taken: (seed + i * 7) % 5 === 0 });
  }
  return slots;
}

export function promoDiscount(promo: PromoCode | undefined, subtotal: number) {
  if (!promo || !promo.active || promo.usedCount >= promo.quota) return 0;
  return promo.type === "percent" ? Math.round((subtotal * promo.value) / 100) : Math.min(promo.value, subtotal);
}

export const ADDRESSES = [
  { id: "home", th: "คอนโด", en: "Condo", detail: "[ที่อยู่ของคุณ] · อโศก" },
  { id: "office", th: "ออฟฟิศ", en: "Office", detail: "[ที่อยู่ของคุณ] · สาทร" },
  { id: "hotel", th: "โรงแรม / ที่อื่น", en: "Hotel / other", detail: "ปักหมุดบนแผนที่" },
] as const;

export function thaiDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" });
}

// ── บล็อกชั่วโมง (หน่วยขายเดียว: 3 / 5 ชม.) ── ไม่มี add-on และไม่มีมัดจำ ลูกค้าจ่ายเต็มตอนจอง
export const BLOCKS = [3, 5] as const;
export type BlockHours = (typeof BLOCKS)[number];

export function blockPrice(post: Post, hours: number) {
  return hours === 5 ? post.price5h : post.price3h;
}

/** สถานที่นัด 7 แบบ (ตรงกับ PLACES) — hint = ตัวอย่างจุดนัด, room = ต้องกรอกที่อยู่/ห้อง */
export const MEET_PLACES = [
  { id: "out", th: "นอกสถานที่", en: "Out & about", sub: "ทริป · ไปด้วยกัน", hint: "จุดนัดรับ เช่น BTS ทองหล่อ" },
  { id: "outdoor", th: "กลางแจ้ง", en: "Outdoors", sub: "สวน · ริมน้ำ", hint: "เช่น สวนเบญจกิติ ประตู 1" },
  { id: "mall", th: "ห้าง", en: "Mall", sub: "ห้างสรรพสินค้า", hint: "เช่น EmQuartier ชั้น G" },
  { id: "cafe", th: "คาเฟ่ / ร้านอาหาร", en: "Café / restaurant", sub: "ร้านที่คุณเลือก", hint: "ชื่อร้าน / สาขา" },
  { id: "condo", th: "คอนโด", en: "Condo", sub: "ที่พักของฉัน", hint: "" },
  { id: "hotel", th: "โรงแรม", en: "Hotel", sub: "ห้องพัก / ล็อบบี้", hint: "" },
  { id: "spa", th: "สปา", en: "Spa", sub: "สถานที่พาร์ทเนอร์", hint: "" },
] as const;
export type MeetPlaceId = (typeof MEET_PLACES)[number]["id"];
export const isRoomPlace = (id: string) => id === "condo" || id === "hotel";

export interface PartnerSpa { id: string; name: string; area: string; km?: number | null; rating?: number | null; price: number }
/** ข้อมูลตัวอย่าง — ใช้เมื่อยังไม่มีสปาพาร์ทเนอร์ที่เปิดแสดงในระบบ (ดู /api/spas) */
export const PARTNER_SPAS: PartnerSpa[] = [
  { id: "s1", name: "Lumière Private Spa", area: "สุขุมวิท 24", km: 1.8, rating: 4.9, price: 600 },
  { id: "s2", name: "The Velvet Room", area: "ทองหล่อ", km: 2.6, rating: 4.8, price: 500 },
  { id: "s3", name: "Sathorn Retreat", area: "สาทร", km: 4.1, rating: 4.7, price: 450 },
];
