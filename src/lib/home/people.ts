// เพื่อนตัวอย่าง (mockup) บนหน้าแรก + หน้าโปรไฟล์ /p/[id] + ตัวอย่างแชท — รูป AI ชุดเดียวกับ canvas (public/brand/home)
// แอปลูกค้ายังไม่เปิด: ข้อมูลทั้งหมดเป็นตัวอย่าง ไม่ใช่ Part-Time จริง

export type Act = "eat" | "massage" | "cafe" | "photo" | "movie" | "gym" | "chill";
export type Person = {
  id: string; nick: string; age: number; img: string; top: boolean; rating: string; reviews: number; jobs: number; years: number;
  area: string; prov?: string; /** ย่านที่ Part-Time ตั้งเอง (ช่อง ~1 กม.) — มีแล้วใช้แทนพิกัดจากชื่อเขต */ geo?: [number, number]; acts: Act[]; free: number; height: number; langs: string; bio: string; review: [string, string];
  /** true = Part-Time จริงจากระบบสมัคร (ยังไม่มีสถิติ/รีวิว) */
  real?: boolean;
  /** โปรโมทอยู่ (จ่ายแผนโปรโมท) = ขึ้นอันดับต้น + ป้าย "แนะนำ" */
  boost?: boolean;
  /** ราคา 3 ชม. จริงจากหน้า "ราคาและส่วนแบ่ง" (คนจริง) */
  price?: number;
  /** จำนวนรูป (คนจริง) */
  photos?: number;
  /** ตำแหน่งรูปหลักในกรอบ (CSS object-position) ที่ Part-Time ปรับเอง */
  pos?: string;
};

const P = (id: string, nick: string, age: number, img: string, top: boolean, rating: string, area: string, acts: Act[], free: number, bio: string, extra: Partial<Person> = {}): Person => {
  const n = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    id, nick, age, img, top, rating, area, acts, free, bio,
    reviews: 12 + (n % 60), jobs: 30 + (n % 110), years: 1 + (n % 4), height: 172 + (n % 12), langs: n % 3 ? "TH · EN" : "TH",
    review: ["คุณ " + "NPMKJS"[n % 6] + ".", "มาตรงเวลา สุภาพมาก คุยเพลิน แนะนำร้านอร่อย"], ...extra,
  };
};

// ตัวอย่าง: ต้น + กอล์ฟ = จ่ายโปรโมทอยู่ (กรอบทอง + ป้ายแนะนำ ขึ้นก่อน) — ให้เห็นหน้าตาก่อนมีคนจ่ายจริง
const BOOSTED = new Set(["ton", "golf"]);
export const PEOPLE: Person[] = (() => [
  P("ton", "ต้น", 29, "/brand/home/p-ton.jpg", true, "5.0", "วัฒนา", ["eat", "massage", "cafe"], 0, "ชอบพาไปลองร้านใหม่ ๆ คุยสนุก ฟังเก่ง ถ่ายรูปสวย และมีสกิลนวดผ่อนคลาย (มีใบรับรอง)"),
  P("phum", "ภูมิ", 31, "/brand/home/p-phum.jpg", true, "4.9", "ทองหล่อ", ["massage", "gym", "eat"], 20, "สายสุขภาพ ชวนออกกำลังเบา ๆ แล้วไปมื้อดี ๆ ต่อ ใจเย็นและตรงเวลา"),
  P("benz", "เบนซ์", 26, "/brand/home/p-benz.jpg", true, "4.9", "สาทร", ["massage", "photo", "cafe"], 0, "ถ่ายรูปเก่ง รู้มุมคาเฟ่สวยทั่วกรุงเทพฯ คุยได้ทุกเรื่อง"),
  P("golf", "กอล์ฟ", 33, "/brand/home/p-golf.jpg", false, "4.8", "อารีย์", ["cafe", "photo", "chill"], 45, "สุขุม ฟังเก่ง ชอบนั่งคาเฟ่เงียบ ๆ คุยเรื่องหนังสือและงานศิลปะ"),
  P("non", "นนท์", 27, "/brand/home/p-non.jpg", false, "4.8", "นิมมาน", ["movie", "chill", "eat"], 0, "คนเชียงใหม่ พาเที่ยวนิมมาน ร้านลับ ๆ และจุดชมวิวยามเย็น", { prov: "เชียงใหม่" }),
  P("pan", "ปั้น", 28, "/brand/home/p-pan.jpg", false, "4.7", "พัทยา", ["eat", "massage", "movie"], 30, "สายทะเล ชวนไปกินซีฟู้ดริมหาด แล้วต่อหนังรอบดึก", { prov: "ชลบุรี" }),
  P("kla", "กล้า", 28, "/brand/home/p-g01.jpg", true, "4.9", "สุขุมวิท", ["eat", "chill", "cafe"], 0, "ยิ้มง่าย อัธยาศัยดี ชอบพาไปบาร์ลับย่านสุขุมวิท"),
  P("tae", "เต้", 32, "/brand/home/p-g02.jpg", true, "5.0", "สีลม", ["eat", "chill", "photo"], 15, "สายดินเนอร์หรู แต่งตัวดี พาไปงานอีเวนต์หรือดินเนอร์ธุรกิจได้"),
  P("mark", "มาร์ค", 30, "/brand/home/p-g04.jpg", false, "4.8", "เอกมัย", ["cafe", "eat", "movie"], 0, "คอกาแฟตัวจริง พาตะลุยคาเฟ่ specialty แล้วต่อมื้อเย็นสบาย ๆ"),
  P("film", "ฟิล์ม", 27, "/brand/home/p-g05.jpg", false, "4.7", "อโศก", ["eat", "chill", "massage"], 60, "อบอุ่น ใส่ใจรายละเอียด ชวนดินเนอร์แคนเดิลไลท์บรรยากาศดี"),
  P("james", "เจมส์", 27, "/brand/home/p-n01.jpg", true, "4.9", "ราชเทวี", ["chill", "eat", "photo"], 0, "ชอบรูฟท็อปบาร์ วิวเมืองยามค่ำ คุยสนุก ถ่ายรูปให้สวย"),
  P("ice", "ไอซ์", 25, "/brand/home/p-n02.jpg", false, "4.8", "ลาดพร้าว", ["movie", "cafe", "gym"], 10, "ร่าเริง สายหนังและเกม ชวนดูหนังรอบพิเศษแล้วไปคาเฟ่ต่อ"),
  P("best", "เบสท์", 29, "/brand/home/p-n03.jpg", false, "4.8", "บางนา", ["gym", "eat", "chill"], 0, "สายฟิต ชวนวิ่งสวนสาธารณะตอนเช้า แล้วไปบรันช์ต่อ"),
  P("art", "อาร์ต", 34, "/brand/home/p-n04.jpg", true, "5.0", "เพลินจิต", ["eat", "photo", "chill"], 25, "สนใจศิลปะและไวน์ พาเดินแกลเลอรี แล้วไปไวน์บาร์บรรยากาศดี"),
  P("nick", "นิค", 26, "/brand/home/p-n05.jpg", false, "4.7", "เมืองภูเก็ต", ["eat", "photo", "chill"], 0, "คนภูเก็ต พาเที่ยวเมืองเก่า กินอาหารพื้นเมือง ชมพระอาทิตย์ตก", { prov: "ภูเก็ต" }),
  P("tim", "ทิม", 30, "/brand/home/p-n06.jpg", false, "4.8", "ปิ่นเกล้า", ["cafe", "movie", "chill"], 40, "ใจดี พูดเพราะ ชวนนั่งริมแม่น้ำ คุยยาว ๆ แบบไม่รีบ"),
  P("first", "เฟิร์ส", 28, "/brand/home/p-n07.jpg", true, "4.9", "ทองหล่อ", ["massage", "eat", "cafe"], 0, "มีใบรับรองนวดแผนไทย ช่วยผ่อนคลายหลังเดินเที่ยวทั้งวัน"),
  P("oat", "โอ๊ต", 31, "/brand/home/p-n08.jpg", false, "4.7", "พระราม 9", ["eat", "movie", "gym"], 15, "สายกิน รู้ร้านเด็ดทั้งสตรีทฟู้ดและไฟน์ไดนิ่ง"),
  P("boss", "บอส", 33, "/brand/home/p-n09.jpg", true, "5.0", "ชิดลม", ["eat", "chill", "photo"], 0, "สุภาพ มาดผู้ใหญ่ เหมาะกับดินเนอร์หรือออกงานสังคม"),
  P("win", "วิน", 26, "/brand/home/p-n10.jpg", false, "4.8", "เมืองขอนแก่น", ["cafe", "eat", "movie"], 5, "อัธยาศัยดี พาเที่ยวคาเฟ่และตลาดกลางคืนขอนแก่น", { prov: "ขอนแก่น" }),
].map((p) => (BOOSTED.has(p.id) ? { ...p, boost: true } : p)))();

export const personById = (id: string) => PEOPLE.find((p) => p.id === id);
export const priceOf = (p: Person) => p.price ?? (p.top ? 10000 : 6500);
