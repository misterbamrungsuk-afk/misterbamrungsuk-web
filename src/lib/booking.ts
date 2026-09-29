// ตัวช่วย flow จองล่วงหน้า (โหมดเดโม: คำนวณฝั่งหน้าเว็บ — โหมดจริงให้เซิร์ฟเวอร์คำนวณซ้ำก่อนสร้างออเดอร์)
import type { Post, PromoCode } from "./types";

export const PACKAGES = [60, 90, 120] as const;
export type PackageMin = (typeof PACKAGES)[number];

export const HERBAL_PRICE = 100; // ประคบสมุนไพร (อุปกรณ์เสริม)

/** ราคาแพ็กเกจ: คิดตามราคา/ชม. ของหมอ ปัดเป็นหลักสิบ */
export function packagePrice(post: Post, minutes: number) {
  return Math.round((post.pricePerHour * minutes) / 60 / 10) * 10;
}

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

/** ช่วงเวลาตามเวลาทำงานของหมอ ทุก 90 นาที; ช่องที่ถูกจองแล้วใช้ค่าสุ่มคงที่ตามวัน (เดโม) */
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
