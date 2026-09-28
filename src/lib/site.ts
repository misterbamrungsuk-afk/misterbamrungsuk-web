export const site = {
  brand: "HaMoo",
  brandTh: "ฮามูู",
  tagline: { th: "เพื่อนที่คุณเลือกได้", en: "The friend you choose" },
  subTagline: { th: "ค้นหา แชทหา นัดเจอ — ปลอดภัยทุกการนัดพบ", en: "Search, chat, meet — safely every time" },
  url: "https://hamoo.app",
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
