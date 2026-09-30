// แพ็กเกจยอดนิยม (หน้าแรก แนว Spafy) — กด "จองเลย" ไปจับคู่หมอตามหมวด
const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=720&h=480&q=70`;

export interface SpaPackage {
  id: string;
  cat: string;
  th: string;
  en: string;
  descTh: string;
  descEn: string;
  minutes: number;
  price: number;
  photo: string;
}

export const SPA_PACKAGES: SpaPackage[] = [
  { id: "thai90", cat: "thai", th: "นวดไทยแผนโบราณ", en: "Traditional Thai", descTh: "คลายกล้ามเนื้อทั้งตัว กดจุดตามแนวเส้น", descEn: "Full-body stretch and pressure points", minutes: 90, price: 750, photo: img("1519823551278-64ac92734fb1") },
  { id: "oil90", cat: "oil", th: "อโรมาออยล์", en: "Aroma Oil", descTh: "น้ำมันหอมระเหย ผ่อนคลายลึก หลับสบาย", descEn: "Essential oils for deep relaxation", minutes: 90, price: 900, photo: img("1544161515-4ab6ce6db874") },
  { id: "office60", cat: "office", th: "แก้ออฟฟิศซินโดรม", en: "Office Syndrome", descTh: "เน้นคอ บ่า หลัง สำหรับคนนั่งทำงานนาน", descEn: "Neck, shoulders and back focus", minutes: 60, price: 600, photo: img("1600334089648-b0d9d3028eb2") },
  { id: "foot60", cat: "foot", th: "นวดเท้าสะท้อนจุด", en: "Foot Reflexology", descTh: "กดจุดฝ่าเท้า ช่วยการไหลเวียนเลือด", descEn: "Reflex points for better circulation", minutes: 60, price: 450, photo: img("1611073615830-9f76902c10fe") },
];

export const HERO_SLIDES = [
  { key: "first", th: "จองครั้งแรก ลด 10%", en: "10% off first booking", subTh: "ใส่โค้ด MORD10 ตอนชำระเงิน", subEn: "Use code MORD10 at checkout", badge: "10%", href: "/matching", photo: img("1515377905703-c4788e51af15") },
  { key: "quick", th: "เรียกด่วน ภายใน 15 วินาที", en: "Quick call in 15 seconds", subTh: "จับคู่หมอใกล้คุณอัตโนมัติ", subEn: "Auto-match a therapist nearby", badge: "15s", href: "/matching", photo: img("1540555700478-4be289fbecef") },
];
