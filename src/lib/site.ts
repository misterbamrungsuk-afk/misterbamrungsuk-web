export const site = {
  brand: "Mister Bamrungsuk",
  brandTh: "มิสเตอร์บำรุงสุข",
  tagline: { th: "เพื่อนกิน เพื่อนเที่ยว ระดับพรีเมียม", en: "Premium companions near you" },
  subTagline: { th: "เลือกเพื่อนตามกิจกรรมที่อยากทำ", en: "Pick a companion by activity" },
  url: "https://app.misterbamrungsuk.com",
  commissionPercent: 15, // หักกลาง 15% ของทุกการจอง (Part-Time ได้ 85%)
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
