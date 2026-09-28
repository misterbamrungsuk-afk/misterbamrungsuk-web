import type { Post, Review, JobBoard, ChatRoom, MemberLite, Order, AppNotification, BankAccount, SavedReply, PromoCode } from "./types";

// ── ข้อมูลจำลองสำหรับโหมดสาธิต (ไม่มีฐานข้อมูลจริง) ──
const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;
const av = (g: string, seed: string) => `https://api.dicebear.com/7.x/${g}/svg?seed=${seed}&backgroundColor=1e1e26`;

const m = (id: string, name: string, gender: "male" | "female", age: number, verified: boolean, province = "กรุงเทพมหานคร"): MemberLite => ({
  id, name,
  avatar: av(gender === "female" ? "notionists-neutral" : "adventurer-neutral", id),
  gender, age, kycVerified: verified, province,
});

export const DEMO_ME: MemberLite = { id: "me", name: "Mo หมู", avatar: av("micah", "me"), gender: "male", age: 28, kycVerified: false, province: "กรุงเทพมหานคร" };

export const DEMO_MEMBERS: MemberLite[] = [
  m("u1", "ทริคกี้", "male", 19, true),
  m("u2", "เนย", "female", 19, true),
  m("u3", "Top", "male", 34, true),
  m("u4", "น้ำส้ม", "female", 21, true),
  m("u5", "C", "male", 31, true),
  m("u6", "Smart", "male", 23, false),
  m("u7", "มายด์", "female", 27, true),
  m("u8", "Guitar", "male", 25, true, "นนทบุรี"),
  m("u9", "อิ๊งค์", "female", 23, true, "นนทบุรี"),
  m("u10", "Satang", "male", 30, true, "เชียงใหม่"),
];

const baseRules = [
  "นัดเจอเฉพาะสถานที่สาธารณะเท่านั้น",
  "ลูกค้ารับผิดชอบค่าเดินทางและค่าใช้จ่ายทั้งหมด",
  "ชำระ 50% ก่อนเริ่มงาน / 50% หลังจบงาน (ผ่านระบบในแอป)",
  "ไม่รับงานผิดกฎหมายทุกประเภท / ไม่รับงานเสี่ยงอันตราย",
  "ไม่แตะเนื้อต้องตัว · รับลูกค้าไม่เกิน 1 คน",
  "สายเกิน 30 นาที หรือยกเลิกภายใน 24 ชม. ยึดมัดจำ",
];

export const DEMO_POSTS: Post[] = [
  {
    id: "p1", member: DEMO_MEMBERS[0],
    images: [img("photo-1519345182560-3f2917c472ef"), img("photo-1511632765486-a01980e01a18")],
    categories: ["eat-travel", "consult", "video-call", "chill", "movie", "shopping", "event", "model", "upcountry"],
    pricePerHour: 500, minHours: 2, deposit: 300, workingHours: "12:00-23:00",
    languages: ["ไทย"], acceptGender: "any", serviceArea: "ได้ทั่วกรุงเทพเลยคั้บ",
    province: "กรุงเทพมหานคร", personality: "เฟรนลี่ ชิลๆ คับบ", interests: "เอนจอยด้วยได้หมดเลยคั้บ",
    extraInfo: "สูง 175 พูดคุยเก่ง มีไหวพริบ", rules: baseRules,
    rating: 5, reviewCount: 6, expiresAt: "+30d", isHidden: false, createdAt: "2026-09-01",
  },
  {
    id: "p2", member: DEMO_MEMBERS[1],
    images: [img("photo-1494790108377-be9c29b29330"), img("photo-1524504388940-b1c1722653e1")],
    categories: ["cafe", "eat-travel", "shopping", "movie", "photographer"],
    pricePerHour: 400, minHours: 2, deposit: 200, workingHours: "10:00-20:00",
    languages: ["ไทย", "English"], acceptGender: "any", serviceArea: "กรุงเทพ + เทศบาล",
    province: "กรุงเทพมหานคร", personality: "ร่าเริง พูดเยอะ เก่งเรื่องของกินหวาน", interests: "คาเฟ่ ถ่ายรูป ดูหนังโรแมนติก",
    extraInfo: "แนะนำคาเฟ่ลับได้เพียบ!", rules: baseRules,
    rating: 5, reviewCount: 4, expiresAt: "+30d", isHidden: false, createdAt: "2026-09-03",
  },
  {
    id: "p3", member: DEMO_MEMBERS[3],
    images: [img("photo-1487412720507-e7ab37603c6f"), img("photo-1529626455594-4ff0802cfb7e")],
    categories: ["eat-travel", "movie", "chill", "event", "camping"],
    pricePerHour: 400, minHours: 2, deposit: 200, workingHours: "11:00-22:00",
    languages: ["ไทย"], acceptGender: "male", serviceArea: "กรุงเทพ / นนทบุรี",
    province: "กรุงเทพมหานคร", personality: "สายชิล คุยเรื่องไว ไม่อายคนแปลกหน้า", interests: "เที่ยวทะเล แคมป์ ดูหนังผี",
    extraInfo: "มีรถ ออกทริปต่างจังหวัดได้สบาย", rules: baseRules,
    rating: 4.8, reviewCount: 5, expiresAt: "+30d", isHidden: false, createdAt: "2026-09-05",
  },
  {
    id: "p4", member: DEMO_MEMBERS[2],
    images: [img("photo-1507003211169-0a1dd7228f2d"), img("photo-1500648767791-00dcc994a43e")],
    categories: ["golf", "caddy", "driver", "consult", "language"],
    pricePerHour: 600, minHours: 3, deposit: 500, workingHours: "06:00-18:00",
    languages: ["ไทย", "English"], acceptGender: "any", serviceArea: "กรุงเทพและปริมณฑล",
    province: "กรุงเทพมหานคร", personality: "ผู้ใหญ่ใจดี มืออาชีพ", interests: "กอล์ฟ ธุรกิจ การลงทุน",
    extraInfo: "แคดดี้มืออาชีพ พาตีกอล์ฟได้ทุกสนาม กรุงเทพฯ", rules: baseRules,
    rating: 5, reviewCount: 3, expiresAt: "+30d", isHidden: false, createdAt: "2026-09-02",
  },
  {
    id: "p5", member: DEMO_MEMBERS[6],
    images: [img("photo-1531123897727-8f129e1688ce"), img("photo-1544005313-94ddf0286df2")],
    categories: ["hospital", "elderly", "errand", "consult"],
    pricePerHour: 350, minHours: 2, deposit: 150, workingHours: "08:00-18:00",
    languages: ["ไทย"], acceptGender: "any", serviceArea: "กรุงเทพ ทั้งหมด",
    province: "กรุงเทพมหานคร", personality: "ใจเย็น อดทน ดูแลเอาใจใส่", interests: "งานดูแลผู้สูงอายุ อาหารเพื่อสุขภาพ",
    extraInfo: "เคยดูแลคุณยาย 5 ปี มีใบรับรองผู้ช่วยพยาบาล", rules: baseRules,
    rating: 5, reviewCount: 8, expiresAt: "+30d", isHidden: false, createdAt: "2026-08-28",
  },
  {
    id: "p6", member: DEMO_MEMBERS[7],
    images: [img("photo-1516280440614-37939bbacd81"), img("photo-1510915361894-db8b60106cb1")],
    categories: ["musician", "event", "content", "other"],
    pricePerHour: 600, minHours: 2, deposit: 300, workingHours: "15:00-24:00",
    languages: ["ไทย"], acceptGender: "any", serviceArea: "กรุงเทพ / นนทบุรี",
    province: "นนทบุรี", personality: "สายมันส์ มีกีตาร์พร้อมเสมอ", interests: "ดนตรี คอนเสิร์ต แต่งเพลง",
    extraInfo: "พี่เลี้ยงจัดงานเล็กๆ พร้อมคอร์ดเพลงทุกยุค", rules: baseRules,
    rating: 4.9, reviewCount: 7, expiresAt: "+30d", isHidden: false, createdAt: "2026-09-08",
  },
  {
    id: "p7", member: DEMO_MEMBERS[5],
    images: [img("photo-1519085360753-af0119f7cbe7"), img("photo-1506794778202-cad84cf45f1d")],
    categories: ["gaming", "language", "video-call", "movie"],
    pricePerHour: 150, minHours: 1, deposit: 0, workingHours: "18:00-02:00",
    languages: ["ไทย", "English"], acceptGender: "any", serviceArea: "ออนไลน์ / วิดีโอคอล",
    province: "กรุงเทพมหานคร", personality: "สายเกม โหดทั้ง FPS MOBA", interests: "เกม อนิเมะ หนังซีรีส์",
    extraInfo: "รับดันแรง + สอนภาษาอังกฤษผ่านเกมได้", rules: baseRules,
    rating: 4.5, reviewCount: 2, expiresAt: "+30d", isHidden: false, createdAt: "2026-09-10",
  },
  {
    id: "p8", member: DEMO_MEMBERS[9],
    images: [img("photo-1508214751196-bcfd4ca60f91"), img("photo-1492562080023-ab3db95bfbce")],
    categories: ["photographer", "cafe", "camping", "upcountry", "abroad"],
    pricePerHour: 300, minHours: 2, deposit: 200, workingHours: "09:00-19:00",
    languages: ["ไทย"], acceptGender: "any", serviceArea: "เชียงใหม่ + ประเทศไทย",
    province: "เชียงใหม่", personality: "ชอบถ่ายรูปธรรมชาติ คุยเรื่องการเดินทางเก่ง", interests: "ภาพถ่าย ธรรมชาติ แบ็กแพ็ค",
    extraInfo: "มีกล้อ + โดรน เอาไปเที่ยวเชียงใหม่ช่วยถ่ายรูปสวยๆ ได้", rules: baseRules,
    rating: 5, reviewCount: 4, expiresAt: "+30d", isHidden: false, createdAt: "2026-09-12",
  },
];

export const DEMO_REVIEWS: Review[] = [
  { id: "r1", postId: "p1", reviewer: m("v1", "Ninegd93", "male", 26, true), rating: 5, content: "ตัวจริงหล่อมากกกกครับ เอ็นจอยอีทติ้งมาก น่าชวนไปกินอีกบ่อยบ่อยเลย", createdAt: "2026-08-24" },
  { id: "r2", postId: "p1", reviewer: m("v2", "Kate", "female", 24, true), rating: 5, content: "ตัวจริงน่ารักมาก หล่อกว่าในรูปอีก เทคแคร์ดีมาก สนุกมากเลยวันนี้", createdAt: "2026-08-12" },
  { id: "r3", postId: "p1", reviewer: m("v3", "Jib", "female", 22, true), rating: 5, content: "น้องน่ารักมากๆ เป็นกันเอง ชวนคุยเก่งมาก ลุยๆ ไปได้ทุกที่ 🥰", createdAt: "2026-08-17" },
  { id: "r4", postId: "p2", reviewer: m("v4", "Ploy", "female", 25, true), rating: 5, content: "พาตามหาคาเฟ่ดีมาก ร้านไหนอร่อยรู้หมด เป็นเพื่อนถ่ายรูปก็เก่ง", createdAt: "2026-09-01" },
  { id: "r5", postId: "p5", reviewer: m("v5", "คุณสมชาย", "male", 45, true), rating: 5, content: "พาคุณพ่อไปหาหมอ ดูแลดีมากครับ ใจเย็น เอาใจใส่ แนะนำมากๆ", createdAt: "2026-09-05" },
  { id: "r6", postId: "p4", reviewer: m("v6", "หัวหน้าตี๋", "male", 52, true), rating: 5, content: "แคดดี้โปรจริงๆ ตีกอล์ฟเป็นเรื่องเป็นราว อธิบายดีมาก", createdAt: "2026-08-30" },
];

const now = new Date();
const daysFromNow = (n: number, h = 15) => {
  const d = new Date(now.getTime() + n * 86400000);
  return d.toISOString().slice(0, 10) + `T${String(h).padStart(2, "0")}:00:00`;
};

export const DEMO_JOBS: JobBoard[] = [
  {
    id: "j1", owner: m("h1", "พลอยแท้✨", "female", 23, true), role: "hirer",
    title: "ว่างน้าา ไปไหนดี", durationHours: 2, scheduleDate: daysFromNow(0), startTime: "15:00", endTime: "17:00",
    placeName: "สยามสแควร์วัน", province: "กรุงเทพมหานคร", lat: 13.7465, lng: 100.5349,
    budget: 1000, images: [img("photo-1517248135467-4c7edcad34c4")], interestedCount: 1, isInterested: false, createdAt: "18h",
  },
  {
    id: "j2", owner: m("h2", "Fuyuko Chan", "female", 30, true), role: "hirer",
    title: "ทานข้าว ดูหนัง เดินเล่น หาเพื่อนไปคาเฟ่ศิลปิน", durationHours: 4, scheduleDate: daysFromNow(0), startTime: "13:00", endTime: "17:00",
    placeName: "The Commons Thonglor", province: "กรุงเทพมหานคร", lat: 13.7279, lng: 100.5685,
    budget: 1000, images: [img("photo-1554118811-1e0d58224f24")], interestedCount: 2, isInterested: false, createdAt: "2d",
  },
  {
    id: "j3", owner: DEMO_MEMBERS[2], role: "provider",
    title: "ว่างครับ ใครอยากไปตีกอล์ฟ/พาเที่ยว", durationHours: 4, scheduleDate: daysFromNow(0), startTime: "17:00", endTime: "21:00",
    placeName: "รัชดาภิเษก", province: "กรุงเทพมหานคร", lat: 13.7706, lng: 100.5698,
    budget: 1000, images: [img("photo-1537944434965-cf4679d1a598")], interestedCount: 3, isInterested: true, createdAt: "11h",
  },
  {
    id: "j4", owner: DEMO_MEMBERS[3], role: "provider",
    title: "ว่างนะคะ ไปไหนไปกัน 😝", durationHours: 10, scheduleDate: daysFromNow(0), startTime: "11:00", endTime: "21:00",
    placeName: "BTS อ่อนนุช", province: "กรุงเทพมหานคร", lat: 13.7011, lng: 100.6016,
    budget: 1500, images: [img("photo-1504674900247-0877df9cc836")], interestedCount: 0, isInterested: false, createdAt: "17h",
  },
  {
    id: "j5", owner: m("h3", "หมูยอ🐷", "female", 25, true), role: "provider",
    title: "ว่างง หาคนชวนกินข้าวดูหนังดึกๆ", durationHours: 4, scheduleDate: daysFromNow(0), startTime: "22:00", endTime: "02:00",
    placeName: "รัชดา ห้าง", province: "กรุงเทพมหานคร", lat: 13.7589, lng: 100.5605,
    budget: 1000, images: [img("photo-1482049016688-2d3e1b311543")], interestedCount: 1, isInterested: false, createdAt: "20h",
  },
  {
    id: "j6", owner: DEMO_MEMBERS[9], role: "provider",
    title: "พาเที่ยวเชียงใหม่ ถ่ายรูปสวยๆ ได้", durationHours: 6, scheduleDate: daysFromNow(1), startTime: "09:00", endTime: "15:00",
    placeName: "นิมมาน เชียงใหม่", province: "เชียงใหม่", lat: 18.7964, lng: 98.9628,
    budget: 1200, images: [img("photo-1528181304800-259b08848526")], interestedCount: 0, isInterested: false, createdAt: "1d",
  },
];

// แชทห้องตัวอย่าง: วงจรเงินครบทุกขั้น (deposit ยืนยันแล้ว, final รอสลิป)
const chatPartner = DEMO_MEMBERS[0];
export const DEMO_ROOMS: ChatRoom[] = [
  {
    id: "room1", partner: chatPartner,
    lastMessage: "โอนเข้าไปแล้วนะครับ ตามสลิปเลย", lastAt: "14:32", unread: 1,
    orderStatus: "in_progress",
    depositCreated: true, depositConfirmed: true, finalCreated: true, finalConfirmed: false, reviewed: false,
    messages: [
      { id: "m1", roomId: "room1", senderId: "me", kind: "text", content: "สวัสดีครับ เห็นโพสต์น้องทริคกี้ สนใจจ้างไปกินข้าว+เดินเล่นสุดสัปดาห์นี้ครับ", createdAt: "13:50", isRead: true },
      { id: "m2", roomId: "room1", senderId: "u1", kind: "text", content: "สวัสดีครับบ ได้เลยคั้บ วันเสาร์ 17:00 นัดสยามได้ไหมครับ", createdAt: "13:55", isRead: true },
      { id: "m3", roomId: "room1", senderId: "me", kind: "text", content: "ได้ครับ จอง 3 ชม. รวมเท่าไหร่ และมัดจำเท่าไหร่ครับ", createdAt: "14:01", isRead: true },
      {
        id: "m4", roomId: "room1", senderId: "u1", kind: "payment", content: "",
        payment: { id: "pay1", type: "deposit", amount: 300, status: "confirmed", bankLabel: "กสิกรไทย x-4451", discount: 0 },
        createdAt: "14:05", isRead: true,
      },
      { id: "m5", roomId: "room1", senderId: "me", kind: "text", content: "โอนมัดจำแล้วครับ ตามสลิป", createdAt: "14:20", isRead: true },
      { id: "m6", roomId: "room1", senderId: "u1", kind: "text", content: "รับเงินเรียบร้อยครับบ แล้วเจอกันวันเสาร์นะครับ 🙏", createdAt: "14:22", isRead: true },
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
    lastMessage: "เจอกันพรุ่งนี้นะคะ ☕", lastAt: "เมื่อวาน", unread: 0,
    orderStatus: "negotiated",
    depositCreated: false, depositConfirmed: false, finalCreated: false, finalConfirmed: false, reviewed: false,
    messages: [
      { id: "n1", roomId: "room2", senderId: "me", kind: "text", content: "หวัดดีครับ อยากให้ช่วยพาไปเที่ยวคาเฟ่ลับๆ 3-4 ร้าน", createdAt: "10:11", isRead: true },
      { id: "n2", roomId: "room2", senderId: "u2", kind: "text", content: "ได้ค่าา มีรายชื่อร้านสวยๆ ติดมือเพียบเลย ราคา 400/ชม. ขั้นต่ำ 2 ชม. ค่ะ", createdAt: "10:15", isRead: true },
      { id: "n3", roomId: "room2", senderId: "u2", kind: "text", content: "เจอกันพรุ่งนี้นะคะ ☕", createdAt: "10:16", isRead: true },
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
  { id: "s1", title: "ราคา", message: "ราคา 400฿/ชม. ขั้นต่ำ 2 ชม. ค่ะ รวมถ่ายรูปให้ 50 รูป" },
  { id: "s2", title: "แนะนำตัว", message: "สวัสดีค่ะ หนูเนยค่ะ สายคาเฟ่ ชอบกินของหวาน ถ่ายรูปเก่งมากค่ะ 😊" },
];

export const DEMO_AUTO_REPLY = "สวัสดีจ้า 🙏 รบกวนแจ้งข้อมูลหน่อยนะคะ 🍽️ กิจกรรม: 📅 วันที่: 🕒 เวลานัดพบ: 📍 สถานที่: ⌛ จำนวนชั่วโมง:";

export const DEMO_NOTIS: AppNotification[] = [
  { id: "n1", type: "chat", title: "ข้อความใหม่", body: "ทริคกี้: โอนเข้าไปแล้วนะครับ ตามสลิปเลย", isRead: false, createdAt: "14:32" },
  { id: "n2", type: "job", title: "มีคนสนใจประกาศของคุณ", body: "Satang สนใจงาน 'พาเที่ยวเชียงใหม่'", isRead: false, createdAt: "12:10" },
  { id: "n3", type: "kyc", title: "ยืนยันตัวตน", body: "ยืนยันตัวตนเพื่อปลดล็อกทุกฟีเจอร์", isRead: true, createdAt: "09:00" },
];

export const DEMO_PROMOS: PromoCode[] = [
  { code: "HAMOO10", type: "percent", value: 10, active: true, usedCount: 25, quota: 100 },
  { code: "WELCOME50", type: "fixed", value: 50, active: true, usedCount: 8, quota: 50 },
  { code: "SUMMER", type: "percent", value: 15, active: false, usedCount: 60, quota: 60 },
];
