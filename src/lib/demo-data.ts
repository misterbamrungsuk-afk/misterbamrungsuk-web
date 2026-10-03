import type { Post, Review, JobBoard, ChatRoom, MemberLite, Order, AppNotification, BankAccount, SavedReply, PromoCode } from "./types";

// ── ข้อมูลจำลองสำหรับโหมดสาธิต (ไม่มีฐานข้อมูลจริง) ──
// รูปโปรไฟล์ = รูปคนจริงจาก Unsplash (stock) เพื่อให้เดโมสมจริง
const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;
const face = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&q=70&crop=faces`;

const m = (id: string, name: string, gender: "male" | "female", age: number, photo: string, province = "กรุงเทพมหานคร"): MemberLite => ({
  id, name, avatar: face(photo), gender, age, kycVerified: true, province,
});

export const DEMO_ME: MemberLite = {
  id: "me", name: "Mo หมู", avatar: face("photo-1633332755192-727a05c4013d"),
  gender: "male", age: 28, kycVerified: false, province: "กรุงเทพมหานคร",
};

export const DEMO_MEMBERS: MemberLite[] = [
  m("u1", "ต้น", "male", 29, "photo-1624395213043-fa2e123b2656"),
  m("u2", "กอล์ฟ", "male", 33, "photo-1681097561932-36d0df02b379"),
  m("u3", "ภูมิ", "male", 31, "photo-1616326431985-b9f89ebc6ab7"),
  m("u4", "นนท์", "male", 27, "photo-1625327009034-039a65fa3153"),
  m("u5", "เจมส์", "male", 30, "photo-1564890112980-007a84d5d700"),
  m("u6", "บอส", "male", 34, "photo-1615269143162-592b3882fcbe"),
  m("u7", "เบนซ์", "male", 26, "photo-1587057173081-36bc799b78ad"),
  m("u8", "ปั้น", "male", 28, "photo-1544168190-79c17527004f", "นนทบุรี"),
  m("u9", "ธาม", "male", 32, "photo-1643990083741-c5a4d4ae69e2", "นนทบุรี"),
  m("u10", "อาร์ม", "male", 29, "photo-1616325629756-e0283ebae72e", "เชียงใหม่"),
];

const baseRules = [
  "นวดเพื่อสุขภาพเท่านั้น สุภาพ มีขอบเขตชัดเจน",
  "หมอนำเบาะ ผ้า และน้ำมันมาเอง",
  "ชำระผ่านระบบกลางในแอปเท่านั้น เงินปล่อยเมื่องานเสร็จ",
  "แจ้งโรคประจำตัว / จุดที่ห้ามนวดก่อนเริ่มงาน",
  "ยกเลิกก่อน 3 ชม. คืนมัดจำเต็มจำนวน",
  "รอลูกค้าได้สูงสุด 15 นาที เกินเวลายึดมัดจำ",
];

export const DEMO_POSTS: Post[] = [
  {
    id: "p1", member: DEMO_MEMBERS[0],
    images: [img("photo-1624395213043-fa2e123b2656"), img("photo-1625327009034-039a65fa3153")],
    categories: ["thai", "office", "neck", "herbal"],
    pricePerHour: 500, minHours: 2, deposit: 300, workingHours: "12:00-23:00",
    languages: ["ไทย"], acceptGender: "any", serviceArea: "กรุงเทพ โซนสุขุมวิท อโศก",
    province: "กรุงเทพมหานคร", personality: "ใจเย็น สุภาพ ถามแรงนวดทุกครั้ง", interests: "นวดไทยแผนโบราณ แก้ออฟฟิศซินโดรม",
    extraInfo: "ใบประกาศนวดไทย 150 ชม. ประสบการณ์ 7 ปี", rules: baseRules,
    lat: 13.7465, lng: 100.5349,
    rating: 5, reviewCount: 5, expiresAt: "+30d", isHidden: false, createdAt: "2026-09-01",
  },
  {
    id: "p2", member: DEMO_MEMBERS[1],
    images: [img("photo-1681097561932-36d0df02b379"), img("photo-1564890112980-007a84d5d700")],
    categories: ["sport", "thai", "herbal"],
    pricePerHour: 400, minHours: 2, deposit: 200, workingHours: "10:00-20:00",
    languages: ["ไทย", "English"], acceptGender: "any", serviceArea: "กรุงเทพ อารีย์ พหลโยธิน",
    province: "กรุงเทพมหานคร", personality: "กระตือรือร้น อธิบายท่ายืดเหยียดให้", interests: "นวดกีฬา คลายกล้ามเนื้อหลังออกกำลัง",
    extraInfo: "อดีตนักกายภาพประจำยิม ดูแลนักวิ่งมาราธอน", rules: baseRules,
    lat: 13.7279, lng: 100.5685,
    rating: 4.9, reviewCount: 4, expiresAt: "+30d", isHidden: false, createdAt: "2026-09-03",
  },
  {
    id: "p3", member: DEMO_MEMBERS[3],
    images: [img("photo-1625327009034-039a65fa3153"), img("photo-1587057173081-36bc799b78ad")],
    categories: ["oil", "thai", "foot"],
    pricePerHour: 400, minHours: 2, deposit: 200, workingHours: "11:00-22:00",
    languages: ["ไทย"], acceptGender: "male", serviceArea: "กรุงเทพ / นนทบุรี",
    province: "กรุงเทพมหานคร", personality: "นุ่มนวล บรรยากาศผ่อนคลาย", interests: "อโรมาเธอราพี นวดน้ำมัน นวดเท้า",
    extraInfo: "ใช้น้ำมันออร์แกนิก ปรับกลิ่นตามชอบได้", rules: baseRules,
    lat: 13.7011, lng: 100.6016,
    rating: 4.8, reviewCount: 3, expiresAt: "+30d", isHidden: false, createdAt: "2026-09-05",
  },
  {
    id: "p4", member: DEMO_MEMBERS[2],
    images: [img("photo-1616326431985-b9f89ebc6ab7"), img("photo-1615269143162-592b3882fcbe")],
    categories: ["office", "neck", "thai"],
    pricePerHour: 600, minHours: 3, deposit: 500, workingHours: "06:00-18:00",
    languages: ["ไทย", "English"], acceptGender: "any", serviceArea: "กรุงเทพ สาทร สีลม",
    province: "กรุงเทพมหานคร", personality: "ตรงเวลา เป็นมืออาชีพ", interests: "ออฟฟิศซินโดรม คอ บ่า ไหล่",
    extraInfo: "รับนวดที่ออฟฟิศช่วงพักเที่ยงได้", rules: baseRules,
    lat: 13.7706, lng: 100.5698,
    rating: 5, reviewCount: 3, expiresAt: "+30d", isHidden: false, createdAt: "2026-09-02",
  },
  {
    id: "p5", member: DEMO_MEMBERS[6],
    images: [img("photo-1587057173081-36bc799b78ad"), img("photo-1616325629756-e0283ebae72e")],
    categories: ["sport", "oil"],
    pricePerHour: 350, minHours: 2, deposit: 150, workingHours: "08:00-18:00",
    languages: ["ไทย"], acceptGender: "any", serviceArea: "กรุงเทพ ทองหล่อ เอกมัย",
    province: "กรุงเทพมหานคร", personality: "สายสปอร์ต แรงนวดหนักแน่น", interests: "นวดกีฬา นวดน้ำมันลึก",
    extraInfo: "เหมาะกับคนออกกำลังหนัก ยืดเหยียดหลังนวด", rules: baseRules,
    lat: 13.7805, lng: 100.5414,
    rating: 5, reviewCount: 4, expiresAt: "+30d", isHidden: false, createdAt: "2026-08-28",
  },
  {
    id: "p6", member: DEMO_MEMBERS[7],
    images: [img("photo-1544168190-79c17527004f"), img("photo-1624395213043-fa2e123b2656")],
    categories: ["thai", "herbal", "foot", "couple"],
    pricePerHour: 600, minHours: 2, deposit: 300, workingHours: "15:00-24:00",
    languages: ["ไทย"], acceptGender: "any", serviceArea: "นนทบุรี / กรุงเทพเหนือ",
    province: "นนทบุรี", personality: "อบอุ่น ดูแลผู้สูงอายุได้ดี", interests: "นวดไทย ประคบสมุนไพร นวดคู่",
    extraInfo: "ประคบสมุนไพรสด ทำเองทุกวัน", rules: baseRules,
    lat: 13.8591, lng: 100.5148,
    rating: 4.9, reviewCount: 3, expiresAt: "+30d", isHidden: false, createdAt: "2026-09-08",
  },
  {
    id: "p7", member: DEMO_MEMBERS[5],
    images: [img("photo-1615269143162-592b3882fcbe"), img("photo-1643990083741-c5a4d4ae69e2")],
    categories: ["foot", "thai"],
    pricePerHour: 150, minHours: 1, deposit: 0, workingHours: "18:00-02:00",
    languages: ["ไทย", "English"], acceptGender: "any", serviceArea: "กรุงเทพ ทั้งหมด",
    province: "กรุงเทพมหานคร", personality: "สุภาพ พูดน้อย เน้นผ่อนคลาย", interests: "นวดเท้า นวดไทย",
    extraInfo: "จุดสะท้อนเท้า ช่วยเรื่องนอนไม่หลับ", rules: baseRules,
    rating: 4.5, reviewCount: 2, expiresAt: "+30d", isHidden: false, createdAt: "2026-09-10",
  },
  {
    id: "p8", member: DEMO_MEMBERS[9],
    images: [img("photo-1616325629756-e0283ebae72e"), img("photo-1616326431985-b9f89ebc6ab7")],
    categories: ["oil", "neck", "office"],
    pricePerHour: 300, minHours: 2, deposit: 200, workingHours: "09:00-19:00",
    languages: ["ไทย"], acceptGender: "any", serviceArea: "เชียงใหม่ ในเมือง",
    province: "เชียงใหม่", personality: "เป็นกันเอง ภาษาอังกฤษได้", interests: "นวดน้ำมัน คอ บ่า ไหล่",
    extraInfo: "รับลูกค้าต่างชาติ โรงแรมในตัวเมือง", rules: baseRules,
    lat: 18.7964, lng: 98.9628,
    rating: 5, reviewCount: 3, expiresAt: "+30d", isHidden: false, createdAt: "2026-09-12",
  },
];

// ── ข้อมูลเสริมเดโม: วันเข้าร่วม / คิวว่าง / พรีเมียม (กำหนดตายตัวเพื่อให้ผลลัพธ์คงที่) ──
const POST_META: Record<string, Pick<Post, "joinedAt" | "nextFreeMin" | "premium">> = {
  p1: { joinedAt: "2026-06-10", nextFreeMin: 0, premium: true },
  p2: { joinedAt: "2026-07-02", nextFreeMin: 45 },
  p3: { joinedAt: "2026-08-15", nextFreeMin: 0 },
  p4: { joinedAt: "2026-05-20", nextFreeMin: 90, premium: true },
  p5: { joinedAt: "2026-07-28", nextFreeMin: 20 },
  p6: { joinedAt: "2026-09-22", nextFreeMin: 0 },
  p7: { joinedAt: "2026-09-12", nextFreeMin: 120, premium: true },
  p8: { joinedAt: "2026-09-28", nextFreeMin: 30 },
};
DEMO_POSTS.forEach((p) => Object.assign(p, POST_META[p.id] ?? {}));

// ── รีวิวตัวอย่าง (โหมดสาธิต) — ตอนใช้งานจริง รีวิวจะเปิดให้เขียนได้เฉพาะเมื่อจบออเดอร์+จ่ายเงินครบเท่านั้น ──
const rv = (id: string, name: string, gender: "male" | "female", photo: string, rating: number, content: string, date: string, postId: string): Review => ({
  id, postId,
  reviewer: { id, name, avatar: face(photo), gender, age: null, kycVerified: true },
  rating, content, createdAt: date,
});

export const DEMO_REVIEWS: Review[] = [
  // ทริคกี้
  rv("r1", "Ninegd93", "male", "photo-1590086782957-93c06ef21604", 5, "นวดดีมาก แรงกำลังพอดี ถามตลอดว่าเจ็บไหม หายปวดหลังเลย", "2026-08-24", "p1"),
  rv("r2", "Kate", "female", "photo-1610088441520-4352457e7095", 5, "ตรงเวลา สุภาพมาก เอาอุปกรณ์มาครบ ห้องไม่เลอะเลย", "2026-08-12", "p1"),
  rv("r3", "Jib", "female", "photo-1487412720507-e7ab37603c6f", 5, "ออฟฟิศซินโดรมที่เป็นมานานดีขึ้นเยอะ จะจองซ้ำแน่นอน", "2026-08-17", "p1"),
  rv("r4", "ต้าเหนิง", "male", "photo-1535713875002-d1d0cf377fde", 5, "มือหนัก กดจุดแม่น ยืดเหยียดให้ก่อนจบ สบายตัวมาก", "2026-07-30", "p1"),
  rv("r5", "แพร", "female", "photo-1508214751196-bcfd4ca60f91", 4, "บรรยากาศผ่อนคลาย น้ำมันกลิ่นหอม หลับไปเลยครึ่งชั่วโมง", "2026-09-02", "p1"),
  // เนย
  rv("r6", "Ploy", "female", "photo-1544005313-94ddf0286df2", 5, "ประคบสมุนไพรร้อนกำลังดี คุณแม่ชอบมาก", "2026-09-01", "p2"),
  rv("r7", "โบว์", "female", "photo-1614289371518-722f2615943d", 5, "อธิบายท่ายืดให้ทำเองที่บ้านด้วย มืออาชีพจริง", "2026-08-21", "p2"),
  rv("r8", "เจมส์", "male", "photo-1628157588553-5eeea00af15c", 4, "ติดต่อง่าย ตอบแชทไว จ่ายผ่านระบบสบายใจ", "2026-08-05", "p2"),
  rv("r9", "กร", "male", "photo-1492562080023-ab3db95bfbce", 5, "นวดดีมาก แรงกำลังพอดี ถามตลอดว่าเจ็บไหม หายปวดหลังเลย", "2026-07-18", "p2"),
  // น้ำส้ม
  rv("r10", "มาย", "female", "photo-1595152772835-219674b2a8a6", 5, "ตรงเวลา สุภาพมาก เอาอุปกรณ์มาครบ ห้องไม่เลอะเลย", "2026-09-04", "p3"),
  rv("r11", "อาร์ม", "male", "photo-1506794778202-cad84cf45f1d", 4, "ออฟฟิศซินโดรมที่เป็นมานานดีขึ้นเยอะ จะจองซ้ำแน่นอน", "2026-08-14", "p3"),
  rv("r12", "แพรวา", "female", "photo-1508214751196-bcfd4ca60f91", 5, "มือหนัก กดจุดแม่น ยืดเหยียดให้ก่อนจบ สบายตัวมาก", "2026-07-22", "p3"),
  // Top
  rv("r13", "คุณสมชาย", "male", "photo-1601412436009-d964bd02edbc", 5, "บรรยากาศผ่อนคลาย น้ำมันกลิ่นหอม หลับไปเลยครึ่งชั่วโมง", "2026-08-30", "p4"),
  rv("r14", "หัวหน้าตี๋", "male", "photo-1583195764036-6dc248ac07d9", 5, "ประคบสมุนไพรร้อนกำลังดี คุณแม่ชอบมาก", "2026-08-12", "p4"),
  rv("r15", "Tanwa", "male", "photo-1535713875002-d1d0cf377fde", 5, "อธิบายท่ายืดให้ทำเองที่บ้านด้วย มืออาชีพจริง", "2026-07-29", "p4"),
  // มายด์
  rv("r16", "คุณสมชาย", "male", "photo-1601412436009-d964bd02edbc", 5, "ติดต่อง่าย ตอบแชทไว จ่ายผ่านระบบสบายใจ", "2026-09-05", "p5"),
  rv("r17", "ป้าสมศรี", "female", "photo-1544005313-94ddf0286df2", 5, "นวดดีมาก แรงกำลังพอดี ถามตลอดว่าเจ็บไหม หายปวดหลังเลย", "2026-08-20", "p5"),
  rv("r18", "Fon", "female", "photo-1517841905240-472988babdf9", 5, "ตรงเวลา สุภาพมาก เอาอุปกรณ์มาครบ ห้องไม่เลอะเลย", "2026-08-02", "p5"),
  rv("r19", "Ninegd93", "male", "photo-1590086782957-93c06ef21604", 4, "ออฟฟิศซินโดรมที่เป็นมานานดีขึ้นเยอะ จะจองซ้ำแน่นอน", "2026-07-11", "p5"),
  // Guitar
  rv("r20", "ปอนด์", "male", "photo-1628157588553-5eeea00af15c", 5, "มือหนัก กดจุดแม่น ยืดเหยียดให้ก่อนจบ สบายตัวมาก", "2026-09-07", "p6"),
  rv("r21", "มายด์ค่า", "female", "photo-1595152772835-219674b2a8a6", 5, "บรรยากาศผ่อนคลาย น้ำมันกลิ่นหอม หลับไปเลยครึ่งชั่วโมง", "2026-08-25", "p6"),
  rv("r22", "Film", "male", "photo-1544723795-3fb6469f5b39", 4, "ประคบสมุนไพรร้อนกำลังดี คุณแม่ชอบมาก", "2026-08-01", "p6"),
  // Smart
  rv("r23", "กัน", "male", "photo-1492562080023-ab3db95bfbce", 5, "อธิบายท่ายืดให้ทำเองที่บ้านด้วย มืออาชีพจริง", "2026-09-09", "p7"),
  rv("r24", "เต้", "male", "photo-1519085360753-af0119f7cbe7", 4, "ติดต่อง่าย ตอบแชทไว จ่ายผ่านระบบสบายใจ", "2026-08-28", "p7"),
  // Satang
  rv("r25", "บี้", "male", "photo-1506794778202-cad84cf45f1d", 5, "นวดดีมาก แรงกำลังพอดี ถามตลอดว่าเจ็บไหม หายปวดหลังเลย", "2026-09-11", "p8"),
  rv("r26", "Namwhan", "female", "photo-1524504388940-b1c1722653e1", 5, "ตรงเวลา สุภาพมาก เอาอุปกรณ์มาครบ ห้องไม่เลอะเลย", "2026-08-16", "p8"),
  rv("r27", "โอ๋", "female", "photo-1489424731084-a5d8b219a5bb", 4, "ออฟฟิศซินโดรมที่เป็นมานานดีขึ้นเยอะ จะจองซ้ำแน่นอน", "2026-07-25", "p8"),
];

const now = new Date();
const daysFromNow = (n: number, h = 15) => {
  const d = new Date(now.getTime() + n * 86400000);
  return d.toISOString().slice(0, 10) + `T${String(h).padStart(2, "0")}:00:00`;
};

export const DEMO_JOBS: JobBoard[] = [
  {
    id: "j1", owner: m("h1", "พลอยแท้✨", "female", 23, "photo-1524504388940-b1c1722653e1"), role: "hirer",
    title: "หาหมอนวดไทย 2 ชม. ที่คอนโด ปวดหลังมาก", durationHours: 2, scheduleDate: daysFromNow(0), startTime: "15:00", endTime: "17:00",
    placeName: "คอนโด สยาม", province: "กรุงเทพมหานคร", lat: 13.7465, lng: 100.5349,
    budget: 1000, images: [img("photo-1517248135467-4c7edcad34c4")], interestedCount: 1, isInterested: false, createdAt: "18h",
  },
  {
    id: "j2", owner: m("h2", "Fuyuko Chan", "female", 30, "photo-1517841905240-472988babdf9"), role: "hirer",
    title: "ออฟฟิศซินโดรม นวดคอ บ่า ไหล่ ที่ออฟฟิศ", durationHours: 4, scheduleDate: daysFromNow(0), startTime: "13:00", endTime: "17:00",
    placeName: "ออฟฟิศ ทองหล่อ", province: "กรุงเทพมหานคร", lat: 13.7279, lng: 100.5685,
    budget: 1000, images: [img("photo-1554118811-1e0d58224f24")], interestedCount: 2, isInterested: false, createdAt: "2d",
  },
  {
    id: "j3", owner: DEMO_MEMBERS[2], role: "provider",
    title: "วันนี้ว่าง รับนวดไทย + ประคบ 17:00–21:00", durationHours: 4, scheduleDate: daysFromNow(0), startTime: "17:00", endTime: "21:00",
    placeName: "รัชดาภิเษก", province: "กรุงเทพมหานคร", lat: 13.7706, lng: 100.5698,
    budget: 1000, images: [img("photo-1537944434965-cf4679d1a598")], interestedCount: 3, isInterested: true, createdAt: "11h",
  },
  {
    id: "j4", owner: DEMO_MEMBERS[3], role: "provider",
    title: "ว่างทั้งวัน รับนวดออฟฟิศซินโดรม โซนอ่อนนุช", durationHours: 10, scheduleDate: daysFromNow(0), startTime: "11:00", endTime: "21:00",
    placeName: "BTS อ่อนนุช", province: "กรุงเทพมหานคร", lat: 13.7011, lng: 100.6016,
    budget: 1500, images: [img("photo-1504674900247-0877df9cc836")], interestedCount: 0, isInterested: false, createdAt: "17h",
  },
  {
    id: "j5", owner: m("h3", "เจมส์", "male", 30, "photo-1564890112980-007a84d5d700"), role: "provider",
    title: "รับนวดกีฬา/น้ำมัน ดึกได้ ถึง 02:00", durationHours: 4, scheduleDate: daysFromNow(0), startTime: "22:00", endTime: "02:00",
    placeName: "รัชดา ห้าง", province: "กรุงเทพมหานคร", lat: 13.7589, lng: 100.5605,
    budget: 1000, images: [img("photo-1482049016688-2d3e1b311543")], interestedCount: 1, isInterested: false, createdAt: "20h",
  },
  {
    id: "j6", owner: DEMO_MEMBERS[9], role: "provider",
    title: "รับนวดน้ำมันที่โรงแรม ตัวเมืองเชียงใหม่", durationHours: 6, scheduleDate: daysFromNow(1), startTime: "09:00", endTime: "15:00",
    placeName: "นิมมาน เชียงใหม่", province: "เชียงใหม่", lat: 18.7964, lng: 98.9628,
    budget: 1200, images: [img("photo-1528181304800-259b08848526")], interestedCount: 0, isInterested: false, createdAt: "1d",
  },
];

// แชทห้องตัวอย่าง: วงจรเงินครบทุกขั้น (deposit ยืนยันแล้ว, final รอสลิป)
export const DEMO_ROOMS: ChatRoom[] = [
  {
    id: "room1", partner: DEMO_MEMBERS[0],
    lastMessage: "โอนเข้าไปแล้วนะครับ ตามสลิปเลย", lastAt: "14:32", unread: 1,
    orderStatus: "in_progress",
    depositCreated: true, depositConfirmed: true, finalCreated: true, finalConfirmed: false, reviewed: false,
    messages: [
      { id: "m1", roomId: "room1", senderId: "me", kind: "text", content: "สวัสดีครับ สนใจนวดไทย 90 นาที ที่คอนโดแถวอโศก คืนวันเสาร์ครับ", createdAt: "13:50", isRead: true },
      { id: "m2", roomId: "room1", senderId: "u1", kind: "text", content: "สวัสดีครับ ได้เลยครับ วันเสาร์ 19:00 สะดวกไหมครับ มีโรคประจำตัวหรือจุดที่ห้ามนวดไหมครับ", createdAt: "13:55", isRead: true },
      { id: "m3", roomId: "room1", senderId: "me", kind: "text", content: "ไม่มีครับ แต่ปวดไหล่ขวามาก รวมเท่าไหร่ และมัดจำเท่าไหร่ครับ", createdAt: "14:01", isRead: true },
      {
        id: "m4", roomId: "room1", senderId: "u1", kind: "payment", content: "",
        payment: { id: "pay1", type: "deposit", amount: 300, status: "confirmed", bankLabel: "กสิกรไทย x-4451", discount: 0 },
        createdAt: "14:05", isRead: true,
      },
      { id: "m5", roomId: "room1", senderId: "me", kind: "text", content: "โอนมัดจำแล้วครับ ตามสลิป", createdAt: "14:20", isRead: true },
      { id: "m6", roomId: "room1", senderId: "u1", kind: "text", content: "ได้รับมัดจำแล้วครับ เจอกันวันเสาร์ 19:00 ครับ", createdAt: "14:22", isRead: true },
      {
        id: "m7", roomId: "room1", senderId: "u1", kind: "payment", content: "",
        payment: { id: "pay2", type: "final", amount: 1200, status: "slip_uploaded", bankLabel: "กสิกรไทย x-4451", slipUrl: img("photo-1554224155-6726b3ff858f"), discount: 0 },
        createdAt: "14:30", isRead: true,
      },
      { id: "m8", roomId: "room1", senderId: "me", kind: "text", content: "โอนเข้าไปแล้วนะครับ ตามสลิปเลย", createdAt: "14:32", isRead: false },
    ],
  },
  {
    id: "room2", partner: DEMO_MEMBERS[1],
    lastMessage: "เจอกันพรุ่งนี้ครับ", lastAt: "เมื่อวาน", unread: 0,
    orderStatus: "negotiated",
    depositCreated: false, depositConfirmed: false, finalCreated: false, finalConfirmed: false, reviewed: false,
    messages: [
      { id: "n1", roomId: "room2", senderId: "me", kind: "text", content: "สวัสดีครับ อยากนวดกีฬาหลังวิ่ง 60 นาทีครับ", createdAt: "10:11", isRead: true },
      { id: "n2", roomId: "room2", senderId: "u2", kind: "text", content: "ได้ครับ 700/ชม. ขั้นต่ำ 1 ชม. มียืดเหยียดให้ด้วยครับ", createdAt: "10:15", isRead: true },
      { id: "n3", roomId: "room2", senderId: "u2", kind: "text", content: "เจอกันพรุ่งนี้ครับ", createdAt: "10:16", isRead: true },
    ],
  },
];

export const DEMO_ORDER: Order = {
  id: "o1", roomId: "room1", hirer: DEMO_ME, provider: DEMO_MEMBERS[0],
  status: "in_progress", totalAmount: 1500, depositAmount: 300, discount: 0, commission: 240, createdAt: "2026-09-26",
};

export const DEMO_BANKS: BankAccount[] = [
  { id: "b1", bankCode: "kbank", bankName: "ธนาคารกสิกรไทย", accountNo: "123-4-56789-0", accountName: "MO DEMO", isPromptPay: false },
  { id: "b2", bankCode: "promptpay", bankName: "พร้อมเพย์", accountNo: "0891234567", accountName: "MO DEMO", isPromptPay: true },
];

export const DEMO_SAVED_REPLIES: SavedReply[] = [
  { id: "s1", title: "ราคา", message: "ราคา 550฿/ชม. ขั้นต่ำ 1 ชม. นำเบาะ ผ้า น้ำมันไปเองครับ" },
  { id: "s2", title: "แนะนำตัว", message: "สวัสดีครับ หมอนวดไทย ประสบการณ์ 7 ปี ถนัดออฟฟิศซินโดรมครับ" },
];

export const DEMO_AUTO_REPLY = "สวัสดีจ้า 🙏 รบกวนแจ้งข้อมูลหน่อยนะคะ 🍽️ กิจกรรม: 📅 วันที่: 🕒 เวลานัดพบ: 📍 สถานที่: ⌛ จำนวนชั่วโมง:";

export const DEMO_NOTIS: AppNotification[] = [
  { id: "n1", type: "chat", title: "ข้อความใหม่", body: "ต้น: ได้รับมัดจำแล้วครับ", isRead: false, createdAt: "14:32" },
  { id: "n2", type: "job", title: "มีคนสนใจประกาศของคุณ", body: "อาร์ม สนใจงาน 'นวดน้ำมันที่โรงแรม'", isRead: false, createdAt: "12:10" },
  { id: "n3", type: "kyc", title: "ยืนยันตัวตน", body: "ยืนยันตัวตนเพื่อปลดล็อกทุกฟีเจอร์", isRead: true, createdAt: "09:00" },
];

export const DEMO_PROMOS: PromoCode[] = [
  { code: "MB10", type: "percent", value: 10, active: true, usedCount: 25, quota: 100, costModel: "A" },
  { code: "WELCOME50", type: "fixed", value: 50, active: true, usedCount: 8, quota: 50, costModel: "B" },
  { code: "SUMMER", type: "percent", value: 15, active: false, usedCount: 60, quota: 60, costModel: "A" },
];

// ── ประวัติออเดอร์ของฉัน ──
export const DEMO_MY_ORDERS: Order[] = [
  { ...DEMO_ORDER, id: "o1" },
  {
    id: "o2", roomId: "room2", hirer: DEMO_ME, provider: DEMO_MEMBERS[1],
    status: "negotiated", totalAmount: 800, depositAmount: 200, discount: 0, commission: 128, createdAt: "2026-09-27",
  },
  {
    id: "o3", roomId: "", hirer: DEMO_ME, provider: DEMO_MEMBERS[6],
    status: "completed", totalAmount: 1050, depositAmount: 150, discount: 0, commission: 210, createdAt: "2026-09-20",
  },
  {
    id: "o4", roomId: "", hirer: DEMO_ME, provider: DEMO_MEMBERS[7],
    status: "reviewed", totalAmount: 1200, depositAmount: 300, discount: 120, promoCode: "MB10", commission: 216, createdAt: "2026-09-12",
  },
];

// ── งานเข้า (บรอดแคสต์หาหมอนวด) ──
export interface IncomingJob {
  id: string;
  hirer: MemberLite;
  title: string;
  hours: number;
  place: string;
  lat: number;
  lng: number;
  budget: number;
  distanceKm: number;
  acceptSeconds: number;
}

export const DEMO_INCOMING: IncomingJob[] = [
  {
    id: "ij1", hirer: m("ih1", "คุณแนท", "female", 29, "photo-1610088441520-4352457e7095"),
    title: "นวดไทย 90 นาที ที่คอนโด", hours: 3, place: "คอนโด สยาม", lat: 13.7465, lng: 100.5350,
    budget: 1200, distanceKm: 1.2, acceptSeconds: 15,
  },
  {
    id: "ij2", hirer: m("ih2", "พี่บอส", "male", 41, "photo-1601412436009-d964bd02edbc"),
    title: "ออฟฟิศซินโดรม 60 นาที", hours: 2, place: "ออฟฟิศ สามย่าน", lat: 13.7384, lng: 100.5306,
    budget: 800, distanceKm: 2.8, acceptSeconds: 15,
  },
];
