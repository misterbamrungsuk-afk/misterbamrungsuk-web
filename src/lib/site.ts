export const site = {
  brand: "Mister Bamrungsuk",
  brandTh: "มิสเตอร์บำรุงสุข",
  tagline: { th: "หมอนวดใกล้คุณ", en: "Massage therapists near you" },
  subTagline: { th: "หมอนวดชายมืออาชีพ มาหาคุณถึงที่", en: "Pro male massage, at your door" },
  url: "https://app.misterbamrungsuk.com",
  commissionPercent: 20, // GP ค่าธรรมเนียมแพลตฟอร์ม (%)
  depositDefault: 300,
  postExpiryDays: 30,
  matchAcceptSeconds: 15, // จับเวลารับงานบรอดแคสต์
  strikeLimit: 3,
};

export const GENDERS = [
  { value: "male", th: "ชาย", en: "Male" },
  { value: "female", th: "หญิง", en: "Female" },
  { value: "other", th: "อื่นๆ", en: "Other" },
] as const;

export type Gender = (typeof GENDERS)[number]["value"];
