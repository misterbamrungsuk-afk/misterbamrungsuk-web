export interface Category {
  slug: string;
  th: string;
  en: string;
  emoji: string;
}

// หมวดบริการนวด (หมอนวดชาย) — แก้ได้จากหลังบ้านในอนาคต
export const CATEGORIES: Category[] = [
  { slug: "thai", th: "นวดไทย", en: "Thai Massage", emoji: "" },
  { slug: "oil", th: "นวดน้ำมัน / อโรมา", en: "Oil / Aroma", emoji: "" },
  { slug: "office", th: "ออฟฟิศซินโดรม", en: "Office Syndrome", emoji: "" },
  { slug: "foot", th: "นวดเท้า", en: "Foot Massage", emoji: "" },
  { slug: "sport", th: "นวดกีฬา", en: "Sports Massage", emoji: "" },
  { slug: "herbal", th: "ประคบสมุนไพร", en: "Herbal Compress", emoji: "" },
  { slug: "neck", th: "คอ บ่า ไหล่", en: "Neck & Shoulder", emoji: "" },
  { slug: "couple", th: "นวดคู่", en: "Couple Massage", emoji: "" },
  { slug: "other", th: "อื่นๆ", en: "Other", emoji: "" },
];

export const catBySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug);

export const PROVINCES = [
  "กรุงเทพมหานคร", "นนทบุรี", "ปทุมธานี", "สมุทรปราการ", "นครปฐม", "สมุทรสาคร",
  "เชียงใหม่", "เชียงราย", "ลำปาง", "พะเยา", "แม่ฮ่องสอน",
  "ภูเก็ต", "กระบี่", "สุราษฎร์ธานี", "นครศรีธรรมราช", "สงขลา", "หาดใหญ่",
  "ขอนแก่น", "อุดรธานี", "นครราชสีมา", "บุรีรัมย์", "อุบลราชธานี",
  "ชลบุรี", "ระยอง", "จันทบุรี", "ตราด",
  "พิษณุโลก", "สุโขทัย", "นครสวรรค์", "พิจิตร", "เพชรบูรณ์",
  "ราชบุรี", "กาญจนบุรี", "สุพรรณบุรี", "อ่างทอง", "สิงห์บุรี",
  "ลพบุรี", "สระบุรี", "อยุธยา", "สมุทรสงคราม",
  "สุราษฎร์ฯ", "ประจวบคีรีขันธ์", "ชุมพร", "ระนอง", "พังงา",
  "สตูล", "ตรัง", "พัทลุง", "ปัตตานี", "ยะลา", "นราธิวาส",
  "มหาสารคาม", "ร้อยเอ็ด", "ยโสธร", "กาฬสินธุ์", "สกลนคร", "นครพนม, หนองคาย",
  "เลย", "หนองบัวลำภู", "อำนาจเจริญ", "บึงกาฬ", "ฉะเชิงเทรา",
  "ปราจีนบุรี", "สระแก้ว", "นครนายก", "กำแพงเพชร", "ตาก", "อุตรดิตถ์", "แพร่", "น่าน",
];

export const BANKS = [
  { code: "kbank", name: "ธนาคารกสิกรไทย", en: "Kasikorn Bank", color: "#138f2d" },
  { code: "scb", name: "ธนาคารไทยพาณิชย์", en: "SCB", color: "#4e2a84" },
  { code: "ktb", name: "ธนาคารกรุงไทย", en: "Krungthai", color: "#1bab5b" },
  { code: "bay", name: "ธนาคารกรุงศรีอยุธยา", en: "Krungsri", color: "#f7b600" },
  { code: "bbl", name: "ธนาคารกรุงเทพ", en: "Bangkok Bank", color: "#1a3c8f" },
  { code: "gsb", name: "ธนาคารออมสิน", en: "GSB", color: "#d0202f" },
  { code: "ttb", name: "ธนาคารทหารไทยทีทีบี", en: "ttb", color: "#ffd200" },
  { code: "promptpay", name: "พร้อมเพย์", en: "PromptPay", color: "#e5484d" },
];
