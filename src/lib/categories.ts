export interface Category {
  slug: string;
  th: string;
  en: string;
  emoji: string;
}

// 26 หมวด ตามทรง Hafriend
export const CATEGORIES: Category[] = [
  { slug: "eat-travel", th: "กิน & เที่ยว", en: "Eat & Travel", emoji: "🍽️" },
  { slug: "photographer", th: "ช่างภาพ", en: "Photographer", emoji: "📸" },
  { slug: "workout", th: "ออกกำลังกาย", en: "Workout", emoji: "🏋️" },
  { slug: "cafe", th: "คาเฟ่", en: "Cafe", emoji: "☕" },
  { slug: "video-call", th: "วิดีโอคอล", en: "Video Call", emoji: "📹" },
  { slug: "movie", th: "ดูหนัง", en: "Movies", emoji: "🎬" },
  { slug: "chill", th: "นั่งชิล", en: "Chill", emoji: "🛋️" },
  { slug: "shopping", th: "ช้อปปิ้ง", en: "Shopping", emoji: "🛍️" },
  { slug: "consult", th: "ปรึกษา & รับฟัง", en: "Consulting", emoji: "💬" },
  { slug: "language", th: "ฝึกภาษา", en: "Language", emoji: "🗣️" },
  { slug: "event", th: "อีเวนต์", en: "Events", emoji: "🎪" },
  { slug: "dharma", th: "ธรรมะ & ทำบุญ", en: "Temple", emoji: "🙏" },
  { slug: "hospital", th: "พาไปหาหมอ", en: "Hospital Visit", emoji: "🏥" },
  { slug: "elderly", th: "เพื่อนผู้สูงอายุ", en: "Elderly Care", emoji: "🧓" },
  { slug: "errand", th: "ทำธุระ", en: "Errands", emoji: "📋" },
  { slug: "content", th: "ทำคอนเทนต์", en: "Content Creator", emoji: "🎥" },
  { slug: "gaming", th: "เล่นเกม", en: "Gaming", emoji: "🎮" },
  { slug: "model", th: "ถ่ายแบบ", en: "Modeling", emoji: "✨" },
  { slug: "camping", th: "แคมป์ปิ้ง", en: "Camping", emoji: "⛺" },
  { slug: "upcountry", th: "ต่างจังหวัด", en: "Up-country", emoji: "🚗" },
  { slug: "abroad", th: "ต่างประเทศ", en: "Travel Abroad", emoji: "✈️" },
  { slug: "driver", th: "ขับรถ", en: "Driver", emoji: "🚙" },
  { slug: "fortune", th: "ดูดวง", en: "Fortune Telling", emoji: "🔮" },
  { slug: "musician", th: "นักดนตรี", en: "Musician", emoji: "🎸" },
  { slug: "golf", th: "ตีกอล์ฟ", en: "Golf", emoji: "⛳" },
  { slug: "caddy", th: "แคดดี้", en: "Caddy", emoji: "🏌️" },
  { slug: "other", th: "อื่นๆ", en: "Other", emoji: "🌟" },
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
