// ภาษาที่รองรับ — ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และ client (ไฟล์ provider เป็น "use client" เรียกฟังก์ชันจากฝั่งเซิร์ฟเวอร์ไม่ได้)
export type Lang = "th" | "en" | "zh";
export const LANG_COOKIE = "hamoo_lang";
export const isLang = (v: unknown): v is Lang => v === "th" || v === "en" || v === "zh";
