export interface Category {
  slug: string;
  th: string;
  en: string;
  emoji: string;
}

// หมวด = กิจกรรม (เพื่อนกิน เพื่อนเที่ยว) — นวดเป็นแค่สกิลหนึ่ง ดู SKILLS ด้านล่าง
// (ประกาศเป็นฟังก์ชันเพราะ ACTIVITIES อยู่ท้ายไฟล์)
export const catBySlug = (slug: string): Category | undefined => {
  const a = ACTIVITIES.find((x) => x.slug === slug);
  return a ? { slug: a.slug, th: a.th, en: a.en, emoji: "" } : undefined;
};

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

// ── กิจกรรม (เพื่อนกินเที่ยว) — ไอคอนเส้น SVG path (viewBox 0 0 24 24) ──
export interface Activity { slug: string; th: string; en: string; icon: string }
export const ACTIVITIES: Activity[] = [
  { slug: "dine", th: "กิน & เที่ยว", en: "Dine & outing", icon: "M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-1.7 0-3 2-3 5s1.3 4 3 4v9" },
  { slug: "photo", th: "ช่างภาพ", en: "Photographer", icon: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" },
  { slug: "fitness", th: "ออกกำลัง", en: "Workout", icon: "M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12" },
  { slug: "cafe", th: "คาเฟ่", en: "Café", icon: "M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2.5 2.5 0 0 1 0 5h-2M8 3v3M12 3v3" },
  { slug: "videocall", th: "วิดีโอคอล", en: "Video call", icon: "M3 7h12v10H3zM15 10l6-3v10l-6-3" },
  { slug: "movie", th: "ดูหนัง", en: "Movies", icon: "M4 5h16v14H4zM4 9h16M4 15h16M8 5v4M12 5v4M16 5v4" },
  { slug: "chill", th: "นั่งชิล", en: "Chill", icon: "M5 11V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4M3 11h18v5H3zM6 16v3M18 16v3" },
];
export const activityBySlug = (slug: string) => ACTIVITIES.find((a) => a.slug === slug);

export const CATEGORIES: Category[] = ACTIVITIES.map((a) => ({ slug: a.slug, th: a.th, en: a.en, emoji: "" }));

/** คำแนะนำตอนพิมพ์กิจกรรมเอง (Part-Time เพิ่มเองได้นอกเหนือรายการนี้) */
export const ACTIVITY_SUGGESTIONS: string[] = [
  ...ACTIVITIES.map((a) => a.th),
  "ช้อปปิ้ง", "ตีกอล์ฟ", "คาราโอเกะ", "ดินเนอร์", "เที่ยวต่างจังหวัด", "คอนเสิร์ต", "ฟิตเนส", "ว่ายน้ำ", "เดินเล่นสวน",
];
/** ป้ายกิจกรรม: slug มาตรฐาน → ชื่อ, ข้อความที่ Part-Time พิมพ์เอง → แสดงตามนั้น */
export const activityLabel = (v: string, th = true) => { const a = activityBySlug(v); return a ? (th ? a.th : a.en) : v; };
/** แปลงชื่อไทยกลับเป็น slug ถ้าตรงกับกิจกรรมมาตรฐาน */
export const activityValue = (label: string) => ACTIVITIES.find((a) => a.th === label)?.slug ?? label;

// ── สกิลพิเศษ (แท็กบนโปรไฟล์ ไม่มีค่าบริการเพิ่ม) ──
export interface Option { slug: string; th: string; en: string }
export const SKILLS: Option[] = [
  { slug: "massage", th: "นวดผ่อนคลาย", en: "Relaxing massage" },
  { slug: "photo", th: "ถ่ายรูปเก่ง", en: "Great photos" },
  { slug: "eng", th: "พูดอังกฤษได้", en: "Speaks English" },
  { slug: "drive", th: "ขับรถพาเที่ยว", en: "Can drive" },
  { slug: "fit", th: "เต้น / ฟิตเนสโค้ช", en: "Dance / fitness coach" },
  { slug: "cook", th: "ทำอาหาร", en: "Cooking" },
  { slug: "music", th: "เล่นดนตรี / ร้องเพลง", en: "Music / singing" },
  { slug: "guide", th: "ไกด์ท้องถิ่น", en: "Local guide" },
];
export const skillBySlug = (slug: string) => SKILLS.find((x) => x.slug === slug);
export const MASSAGE_NOTE = { th: "แสดงเฉพาะเพื่อนที่มีใบรับรอง", en: "Only companions with a certificate" };

// ── สถานที่นัด ──
export const PLACES: Option[] = [
  { slug: "out", th: "นอกสถานที่", en: "Out & about" },
  { slug: "outdoor", th: "กลางแจ้ง", en: "Outdoors" },
  { slug: "mall", th: "ห้าง", en: "Mall" },
  { slug: "cafe", th: "คาเฟ่ / ร้านอาหาร", en: "Café / restaurant" },
  { slug: "condo", th: "คอนโด", en: "Condo" },
  { slug: "hotel", th: "โรงแรม", en: "Hotel" },
  { slug: "spa", th: "สปา", en: "Spa" },
];
export const placeBySlug = (slug: string) => PLACES.find((x) => x.slug === slug);
