// ข้อความหน้าที่ลูกค้าเห็น 3 ภาษา: ไทย · English · 中文 (จีนตัวย่อ — มาตรฐานสิงคโปร์) · เตรียมนำเสนอที่สิงคโปร์ (29 ต.ค. 2569)
// หน้า: หน้าแรก · โปรไฟล์เพื่อน · แผนที่ · ร่วมงานกับเรา · เร็ว ๆ นี้ · ขอบล่าง · แบนเนอร์คุกกี้
// คำจีนเลี่ยงคำที่สื่อบริการผู้ใหญ่ (陪玩/伴游) — ใช้ 社交陪同 / 餐饮出游伙伴 · ควรให้เจ้าของภาษาตรวจก่อนใช้จริง
import type { Act } from "@/lib/home/people";

export type SiteLang = "th" | "en" | "zh";

const th = {
  intl: "th-TH",
  common: { home: "หน้าแรก", map: "แผนที่", login: "เข้าสู่ระบบ", register: "สมัครทันที", myAccount: "บัญชีของฉัน", myBookings: "นัดของฉัน", notifications: "การแจ้งเตือน", close: "ปิด", later: "ไว้ทีหลัง", details: "ดูรายละเอียด", ad: "โฆษณา", advertise: "โฆษณากับเรา ›", per3h: "/ 3 ชม.", back: "ย้อนกลับ", lang: "ภาษา", soon: "ตัวอย่าง · เปิดให้บริการเร็ว ๆ นี้", years: (n: number) => `${n} ปี`, cm: (n: number) => `${n} ซม.`, people: (n: number) => `${n} คน` },
  acts: { eat: "กิน & เที่ยว", massage: "นวดผ่อนคลาย", cafe: "คาเฟ่", photo: "ถ่ายรูป", movie: "ดูหนัง", gym: "ออกกำลัง", chill: "นั่งชิล" } as Record<Act, string>,
  home: {
    metaTitle: "Mister Bamrungsuk — เลือกเพื่อนของคุณ",
    navHome: "หน้าแรก", navSample: [["/join/showcase", "ดูเพื่อน"], ["/map", "แผนที่"], ["/join/earnings", "รายได้"], ["/policy", "กฎเกณฑ์"], ["/work-with-us", "ร่วมทีม"]] as [string, string][],
    joinTeam: "สมัครร่วมทีม",
    hello: (n: string) => `สวัสดี คุณ${n} 👋`,
    sampleTag: "หน้าตัวอย่าง · สิ่งที่ลูกค้าเห็นในแอป",
    title: "เลือกเพื่อนของคุณ", titleSample: "เพื่อนกินเที่ยวในแอปของเรา",
    sampleCta: "อยากเป็นเพื่อนกินเที่ยวแบบนี้?", sampleFee: (p: string) => `ค่าสมัครเริ่มต้น ${p} (รวมอบรม) · เลือกวันเวลาเอง`,
    shop: [["โรงแรม · สปา", "ราคาสมาชิก"], ["สินค้า", "ส่งถึงบ้าน"]] as [string, string][], shopNav: "ซื้อบริการและสินค้า",
    work: "ร่วมงานกับเรา", apply: "สมัคร →",
    search: "ค้นหาชื่อ ย่าน หรือกิจกรรม", searchLbl: "ค้นหา", onMap: "ดูบนแผนที่", filters: "ตัวกรอง",
    sorts: { top: "แนะนำ · TOP ก่อน", rate: "คะแนนสูงสุด", price: "ราคา" },
    friends: "เพื่อนในระบบ", groupTabs: "หมวด", man: "หนุ่มหล่อ", tom: "ทอมหล่อ", found: (n: number) => `พบ ${n} คน`,
    featured: "★ แนะนำ",
    tomSoon: "ทอมหล่อ เร็ว ๆ นี้", tomSoonSub: "กำลังเปิดรับสมัครทอมหล่อรุ่นแรก", tomApply: "สมัครเป็นทอมหล่อ ›",
    empty: "ยังไม่เจอเพื่อนที่ตรงใจ ลองเลือกกิจกรรมให้น้อยลงดูนะคะ",
    adsLbl: "โฆษณา", adN: (i: number, n: number, name: string) => `โฆษณา ${i}/${n} · ${name}`, adDot: (i: number) => `ดูโฆษณาที่ ${i}`, unread: (n: number) => `ยังไม่อ่าน ${n}`,
    slides: [
      { kind: "สปาพาร์ทเนอร์ · สีลม", name: "บำรุงสุข สปา", offer: "สมาชิกลด 20%" },
      { kind: "โรงแรมพาร์ทเนอร์ · สาทร", name: "The Sathorn Retreat", offer: "ห้องพักราคาสมาชิก" },
      { kind: "รีสอร์ทพาร์ทเนอร์ · หัวหิน", name: "Seaside Villa", offer: "พักริมทะเล ลด 15% สำหรับสมาชิก" },
    ],
    midAds: [
      { name: "The Sathorn Retreat", sub: "ห้องพักราคาสมาชิก" },
      { name: "บำรุงสุข สปา", sub: "สมาชิกลด 20%" },
      { name: "ชุดของขวัญ Gold Box", sub: "ของขวัญพรีเมียม ส่งถึงบ้าน" },
      { name: "Seaside Villa", sub: "พักริมทะเล ลด 15% สำหรับสมาชิก" },
      { name: "Body Oil ลาเวนเดอร์", sub: "น้ำมันนวดผ่อนคลาย" },
    ],
    footAd: "น้ำมันนวดออร์แกนิก", footAdSub: "ซื้อใน Marketplace ›",
    promoAria: "โปรเปิดเมมเบอร์ Gold / Black",
    promoGold: (pay: string, credit: string) => [`เปิดเมม Gold`, `จ่าย ${pay}`, `รับ ${credit}`] as [string, string, string],
    promoBlack: (pay: string, credit: string) => `Black จ่าย ${pay} รับ ${credit} · แต้มคูณ · บัตรสมาชิก`,
    promoCta: "ดูโปรเมมเบอร์ ›",
    recruitTag: "ร่วมงานกับเรา", recruitTitle: "เป็นเพื่อนกินเที่ยว Mister Bamrungsuk", recruitApply: "สมัคร Part-Time", recruitEarn: "ดูรายได้และส่วนแบ่ง",
    memberTitle: "เปิดเมม ได้เครดิตเพิ่มทันที", pay: (v: string) => `จ่าย ${v}`, get: (v: string) => `รับ ${v}`,
    memberPerks: ["เครดิตเพิ่มใช้นัดเพื่อน สปา โรงแรม และสินค้า", "แต้มสะสมคูณทุกการใช้จ่าย", "โปรไฟล์สีพิเศษตามระดับ + บัตรสมาชิกดิจิทัล"], memberCta: "ดูโปรเมมเบอร์",
    fTitle: "ตัวกรองช่วยค้นหาเพื่อน", fRegion: "ภูมิภาค", fProv: "จังหวัด", fAllProv: "ทุกจังหวัด", fSpot: "จุดพื้นที่ เช่น สุขุมวิท ลาดพร้าว สาทร บางนา", fSpotLbl: "จุดพื้นที่",
    regions: [["", "ทุกภาค"], ["bkk", "กรุงเทพฯ และภาคกลาง"], ["north", "ภาคเหนือ"], ["ne", "ภาคตะวันออกเฉียงเหนือ"], ["south", "ภาคใต้"]] as [string, string][],
    fType: "ประเภท", types: [["", "ทุกประเภท"], ["eat", "เพื่อนกินเที่ยว"], ["massage", "สายนวด"]] as [string, string][],
    fTier: "ระดับ", allTiers: "ทุกระดับ", fAct: "กิจกรรม", allActs: "ทุกกิจกรรม", fAge: "ช่วงอายุ (ปี)", ageMin: "อายุต่ำสุด", ageMax: "อายุสูงสุด", clear: "ล้างข้อมูล", go: (n: number) => `ค้นหาเพื่อน · ${n} คน`,
    tabSample: { see: "ดูเพื่อน", earn: "รายได้", rules: "กฎเกณฑ์", team: "ร่วมทีม" },
  },
  profile: {
    preview: "เปิดให้จองเร็ว ๆ นี้", previewSample: "ตัวอย่าง · เปิดให้บริการเร็ว ๆ นี้",
    fav: "บันทึกเป็นคนโปรด", photo: (i: number) => `ดูรูปที่ ${i}`, featured: "★ แนะนำ", verified: "✓ ยืนยันตัวตน + ตรวจประวัติ",
    newRating: "ใหม่", reviewsN: (n: number) => `${n} รีวิว`, newPt: "Part-Time ใหม่", trained: "ผ่านอบรม", training: "รออบรม", idOk: "ยืนยันตัวตน", tier: "ระดับ",
    jobs: "นัดสำเร็จ", exp: "ประสบการณ์", reply: "ตอบกลับ",
    freeToday: "วันนี้ว่าง", liked: "✓ สนใจแล้ว", like: "สนใจ", likedNote: (n: string) => `${n}จะเห็นว่าคุณสนใจ · อยากนัดเลยกด "จองเลย"`, likeNote: (n: string) => `บอก${n}ว่าคุณสนใจ (ไม่เปิดเผยข้อมูลติดต่อ)`, likeErr: "ไม่สำเร็จ ลองใหม่อีกครั้ง",
    about: (n: string) => `เกี่ยวกับ${n}`, service: "เลือกบริการ", hours: (h: number) => `นัด ${h} ชม.`, h3: "กิน เที่ยว คาเฟ่ ดูหนัง", h5: "เหมาครึ่งวัน เปลี่ยนกิจกรรมได้",
    reviews: "รีวิว", noReviews: "ยังไม่มีรีวิว · รีวิวจะขึ้นหลังจบนัดแรก", fromN: (n: number) => `จาก ${n} รีวิว (ลูกค้าที่จองจริง)`, allReviews: "ดูรีวิวทั้งหมด ›", daysAgo: "3 วันที่แล้ว", sampleReview: "มาตรงเวลา สุภาพมาก คุยเพลิน แนะนำร้านอร่อย",
    noteReal: "จองแล้วเงินพักไว้กับเราจนจบนัด · คุยกับเพื่อนได้ในแชทหลังเพื่อนตอบรับ", noteSample: "ข้อมูลตัวอย่าง · เลือกเพื่อนที่เปิดรับงานจริงจากหน้าแรกเพื่อจอง",
    hShort: (h: number) => `${h} ชม.`, chat: "แชท", chatWith: (n: string) => `แชทกับ${n}`, book: "จองเลย",
  },
  map: {
    metaTitle: "แผนที่ — Mister Bamrungsuk", aria: "แผนที่เพื่อนและสถานที่พาร์ทเนอร์", search: "ค้นหาย่าน เช่น อโศก, ทองหล่อ", searchLbl: "ค้นหาย่าน",
    layers: { all: "ทั้งหมด", p: "เพื่อน", v: "พาร์ทเนอร์" }, count: (p: number, v: number) => [`${p}`, " เพื่อน · ", `${v}`, " พาร์ทเนอร์"] as [string, string, string, string],
    locate: "ไปที่ตำแหน่งของฉัน", fit: "ดูหมุดทั้งหมด", away: (d: string) => ` · ห่างประมาณ ${d}`, profile: "ดูโปรไฟล์",
    venue: (s: boolean) => `สถานที่พาร์ทเนอร์ · สปา${s ? " (ตัวอย่าง)" : ""}`, venueNote: "นัดเพื่อนมาที่นี่ได้ (เปิดให้จองเร็ว ๆ นี้)",
    none: "ไม่พบในย่านนี้ ลองค้นหาย่านอื่นหรือเอาตัวกรองออก", sample: "ข้อมูลตัวอย่าง · ตำแหน่งบนแผนที่เป็นย่านโดยประมาณ ไม่ใช่ตำแหน่งจริง",
  },
  work: {
    metaTitle: "ร่วมงานกับเรา — Mister Bamrungsuk", title: "ร่วมงานกับเรา", ptLogin: "มีโปรไฟล์ Part-Time แล้ว? เข้าสู่ระบบ ›",
    paths: [
      { title: "เพื่อนกินเที่ยว", sub: "งานพาร์ทไทม์ เลือกวันเวลาเอง", go: "สมัครพาร์ทไทม์ ›" },
      { title: "สปาและโรงแรม", sub: "รับลูกค้าพรีเมียมผ่านแพลตฟอร์ม", go: "สมัครพาร์ทเนอร์ ›" },
      { title: "เปิดร้านค้ากับเรา", sub: "วางขายสินค้าถึงลูกค้าพรีเมียม", go: "เริ่มขายสินค้า ›" },
    ],
    contact: "ติดต่อเรา", terms: "ข้อกำหนดและเงื่อนไขการใช้งาน", privacy: "นโยบายความเป็นส่วนตัว (PDPA)",
  },
  soon: {
    metaTitle: "เปิดให้บริการเร็ว ๆ นี้ — Mister Bamrungsuk", title: "เปิดให้บริการเร็ว ๆ นี้", body: "ตอนนี้เปิดรับสมัคร Part-Time เพื่อนกินเที่ยว Mister Bamrungsuk · หน้าจองและบริการอื่นจะเปิดเร็ว ๆ นี้",
    apply: "สมัคร Part-Time", ptLogin: "Part-Time เข้าสู่ระบบ", home: "กลับหน้าแรก",
  },
  footer: {
    cols: [
      { title: "สำหรับลูกค้า", links: [["/", "ค้นหาเพื่อนกินเที่ยว"], ["/map", "แผนที่"], ["/quick", "เรียกด่วน"], ["/stay", "โรงแรม · สปา"], ["/market", "Marketplace"], ["/orders/track", "ติดตามคำสั่งซื้อ"]] },
      { title: "ร่วมงานกับเรา", links: [["/join", "สมัคร Part-Time"], ["/join/earnings", "รายได้ Part-Time"], ["/join/showcase", "หน้าตัวอย่างแอป"], ["/join/me", "เข้าโปรไฟล์ Part-Time"], ["/partner", "พาร์ทเนอร์สปา · โรงแรม"], ["/vendor", "เปิดร้านค้ากับเรา"]] },
      { title: "ช่วยเหลือและนโยบาย", links: [["/page/terms", "ข้อกำหนดการใช้งาน"], ["/privacy", "นโยบายความเป็นส่วนตัว (PDPA)"], ["/policy", "กฎเกณฑ์และความปลอดภัย"], ["/sos", "SOS ฉุกเฉิน"]] },
    ] as { title: string; links: [string, string][] }[],
    short: [["/page/terms", "ข้อกำหนด"], ["/privacy", "ความเป็นส่วนตัว"], ["/policy", "กฎเกณฑ์"], ["/work-with-us", "ร่วมงานกับเรา"]] as [string, string][],
    keyLinks: "ลิงก์สำคัญ", tel: "โทร", about: "เพื่อนกินเที่ยวพรีเมียม ผ่านการอบรมและยืนยันตัวตน · ชำระเงินผ่านระบบ เงินพักไว้กับเราจนจบนัด",
    rights: "สงวนลิขสิทธิ์", reg: (n: string) => `ทะเบียนนิติบุคคลเลขที่ ${n}`, buddhist: true,
  },
  cookie: {
    aria: "การตั้งค่าคุกกี้", text: "เราใช้คุกกี้ที่จำเป็นเพื่อให้แอปทำงาน และขออนุญาตใช้คุกกี้วิเคราะห์/การตลาดเพื่อปรับปรุงบริการ", privacy: "นโยบายความเป็นส่วนตัว", terms: "เงื่อนไข",
    need: ["จำเป็น", "การเข้าสู่ระบบ ความปลอดภัย การจอง (ปิดไม่ได้)"], stats: ["วิเคราะห์การใช้งาน", "นับสถิติแบบไม่ระบุตัวตน เพื่อปรับปรุงแอป"], mkt: ["การตลาด", "พิกเซลโฆษณา เพื่อแสดงข้อเสนอที่ตรงใจ"],
    all: "ยอมรับทั้งหมด", needOnly: "เฉพาะที่จำเป็น", save: "บันทึกการตั้งค่า", settings: "ตั้งค่า",
  },
  tab: { home: "หน้าแรก", map: "แผนที่", quick: "เรียกด่วน", chat: "แชท", profile: "บัญชี", aria: "เมนูหลัก" },
};

export type SiteDict = typeof th;

const en: SiteDict = {
  intl: "en-SG",
  common: { home: "Home", map: "Map", login: "Log in", register: "Sign up", myAccount: "My account", myBookings: "My bookings", notifications: "Notifications", close: "Close", later: "Maybe later", details: "View details", ad: "Promo", advertise: "Partner with us ›", per3h: "/ 3 hrs", back: "Back", lang: "Language", soon: "Preview · Launching soon", years: (n) => `${n} yrs`, cm: (n) => `${n} cm`, people: (n) => `${n} people` },
  acts: { eat: "Dining & outings", massage: "Relaxing massage", cafe: "Cafés", photo: "Photography", movie: "Movies", gym: "Fitness", chill: "Chill & lounge" },
  home: {
    metaTitle: "Mister Bamrungsuk — Choose your companion",
    navHome: "Home", navSample: [["/join/showcase", "Companions"], ["/map", "Map"], ["/join/earnings", "Earnings"], ["/policy", "Rules"], ["/work-with-us", "Join us"]],
    joinTeam: "Join the team",
    hello: (n) => `Hello, ${n} 👋`,
    sampleTag: "Preview · what customers see in the app",
    title: "Choose your companion", titleSample: "Dining & outing companions in our app",
    sampleCta: "Want to be a companion like this?", sampleFee: (p) => `Sign-up from ${p} (training included) · choose your own schedule`,
    shop: [["Hotels · Spas", "Member rates"], ["Shop", "Home delivery"]], shopNav: "Services and products",
    work: "Work with us", apply: "Apply →",
    search: "Search name, area or activity", searchLbl: "Search", onMap: "View on map", filters: "Filters",
    sorts: { top: "Recommended · TOP first", rate: "Top rated", price: "Price" },
    friends: "Companions", groupTabs: "Category", man: "Gentlemen", tom: "Handsome Toms", found: (n) => `${n} found`,
    featured: "★ Featured",
    tomSoon: "Handsome Toms · coming soon", tomSoonSub: "Now recruiting our first group", tomApply: "Apply as a Tom ›",
    empty: "No matches yet. Try selecting fewer activities.",
    adsLbl: "Featured offers", adN: (i, n, name) => `Offer ${i}/${n} · ${name}`, adDot: (i) => `Show offer ${i}`, unread: (n) => `${n} unread`,
    slides: [
      { kind: "Partner spa · Silom", name: "Bamrungsuk Spa", offer: "Members save 20%" },
      { kind: "Partner hotel · Sathorn", name: "The Sathorn Retreat", offer: "Member room rates" },
      { kind: "Partner resort · Hua Hin", name: "Seaside Villa", offer: "Beachfront stays · members save 15%" },
    ],
    midAds: [
      { name: "The Sathorn Retreat", sub: "Member room rates" },
      { name: "Bamrungsuk Spa", sub: "Members save 20%" },
      { name: "Gold Box gift set", sub: "Premium gifts, delivered" },
      { name: "Seaside Villa", sub: "Beachfront stays · members save 15%" },
      { name: "Lavender Body Oil", sub: "Relaxing massage oil" },
    ],
    footAd: "Organic massage oil", footAdSub: "Shop on Marketplace ›",
    promoAria: "Gold / Black membership offer",
    promoGold: (pay, credit) => ["Gold membership", `Pay ${pay}`, `get ${credit}`],
    promoBlack: (pay, credit) => `Black: pay ${pay}, get ${credit} · bonus points · member card`,
    promoCta: "See membership ›",
    recruitTag: "Work with us", recruitTitle: "Become a Mister Bamrungsuk companion", recruitApply: "Apply for Part-Time", recruitEarn: "See earnings & revenue share",
    memberTitle: "Join and get bonus credit instantly", pay: (v) => `Pay ${v}`, get: (v) => `Get ${v}`,
    memberPerks: ["Use credit for companions, spas, hotels and products", "Bonus points on every purchase", "Tier-coloured profile + digital member card"], memberCta: "See membership",
    fTitle: "Find a companion", fRegion: "Region", fProv: "Province", fAllProv: "All provinces", fSpot: "Area, e.g. Sukhumvit, Lat Phrao, Sathorn, Bang Na", fSpotLbl: "Area",
    regions: [["", "All regions"], ["bkk", "Bangkok & Central"], ["north", "North"], ["ne", "Northeast"], ["south", "South"]],
    fType: "Type", types: [["", "All types"], ["eat", "Dining & outings"], ["massage", "Massage"]],
    fTier: "Tier", allTiers: "All tiers", fAct: "Activity", allActs: "All activities", fAge: "Age range (years)", ageMin: "Minimum age", ageMax: "Maximum age", clear: "Clear", go: (n) => `Show ${n} companions`,
    tabSample: { see: "Companions", earn: "Earnings", rules: "Rules", team: "Join us" },
  },
  profile: {
    preview: "Booking opens soon", previewSample: "Preview · Launching soon",
    fav: "Save to favourites", photo: (i) => `Photo ${i}`, featured: "★ Featured", verified: "✓ ID verified + background checked",
    newRating: "New", reviewsN: (n) => `${n} reviews`, newPt: "New companion", trained: "Trained", training: "Training soon", idOk: "ID verified", tier: "Tier",
    jobs: "Bookings", exp: "Experience", reply: "Response",
    freeToday: "Available today", liked: "✓ Interested", like: "I'm interested", likedNote: (n) => `${n} will see you're interested · tap "Book now" to meet`, likeNote: (n) => `Let ${n} know you're interested (your contact stays private)`, likeErr: "Something went wrong. Please try again.",
    about: (n) => `About ${n}`, service: "Choose a service", hours: (h) => `${h}-hour meet-up`, h3: "Dining, outings, cafés, movies", h5: "Half day · switch activities freely",
    reviews: "Reviews", noReviews: "No reviews yet · reviews appear after the first booking", fromN: (n) => `from ${n} reviews (verified bookings)`, allReviews: "All reviews ›", daysAgo: "3 days ago", sampleReview: "Punctual, very polite, great conversation and recommended a delicious restaurant.",
    noteReal: "Your payment is held securely until the meet-up ends · chat opens once your companion accepts", noteSample: "Sample profile · choose an available companion on the home page to book",
    hShort: (h) => `${h} hrs`, chat: "Chat", chatWith: (n) => `Chat with ${n}`, book: "Book now",
  },
  map: {
    metaTitle: "Map — Mister Bamrungsuk", aria: "Map of companions and partner venues", search: "Search an area, e.g. Asok, Thong Lo", searchLbl: "Search area",
    layers: { all: "All", p: "Companions", v: "Partners" }, count: (p, v) => [`${p}`, " companions · ", `${v}`, " partners"],
    locate: "Go to my location", fit: "Show all pins", away: (d) => ` · about ${d} away`, profile: "View profile",
    venue: (s) => `Partner venue · Spa${s ? " (sample)" : ""}`, venueNote: "Meet your companion here (booking opens soon)",
    none: "Nothing in this area. Try another area or remove filters.", sample: "Sample data · pins show the approximate area, not exact locations",
  },
  work: {
    metaTitle: "Work with us — Mister Bamrungsuk", title: "Work with us", ptLogin: "Already a Part-Time companion? Log in ›",
    paths: [
      { title: "Dining & outing companion", sub: "Part-time work on your own schedule", go: "Apply for Part-Time ›" },
      { title: "Spas & hotels", sub: "Reach premium customers through our platform", go: "Become a partner ›" },
      { title: "Open a shop with us", sub: "Sell to premium customers", go: "Start selling ›" },
    ],
    contact: "Contact us", terms: "Terms & Conditions", privacy: "Privacy Policy (PDPA)",
  },
  soon: {
    metaTitle: "Launching soon — Mister Bamrungsuk", title: "Launching soon", body: "We're currently recruiting Part-Time dining & outing companions. Booking and other services open soon.",
    apply: "Apply for Part-Time", ptLogin: "Part-Time log in", home: "Back to home",
  },
  footer: {
    cols: [
      { title: "For customers", links: [["/", "Find a companion"], ["/map", "Map"], ["/quick", "Quick match"], ["/stay", "Hotels · Spas"], ["/market", "Marketplace"], ["/orders/track", "Track an order"]] },
      { title: "Work with us", links: [["/join", "Apply for Part-Time"], ["/join/earnings", "Part-Time earnings"], ["/join/showcase", "App preview"], ["/join/me", "Part-Time log in"], ["/partner", "Spa & hotel partners"], ["/vendor", "Open a shop"]] },
      { title: "Help & policies", links: [["/page/terms", "Terms of use"], ["/privacy", "Privacy Policy (PDPA)"], ["/policy", "Rules & safety"], ["/sos", "SOS emergency"]] },
    ],
    short: [["/page/terms", "Terms"], ["/privacy", "Privacy"], ["/policy", "Rules"], ["/work-with-us", "Work with us"]],
    keyLinks: "Key links", tel: "Tel", about: "Premium dining & outing companions, trained and ID-verified · pay in-app, funds held until your meet-up ends",
    rights: "All rights reserved", reg: (n) => `Company reg. no. ${n}`, buddhist: false,
  },
  cookie: {
    aria: "Cookie settings", text: "We use essential cookies to run the app and ask your permission for analytics/marketing cookies to improve our service.", privacy: "Privacy Policy", terms: "Terms",
    need: ["Essential", "Login, security and bookings (always on)"], stats: ["Analytics", "Anonymous usage statistics to improve the app"], mkt: ["Marketing", "Ad pixels to show relevant offers"],
    all: "Accept all", needOnly: "Essential only", save: "Save settings", settings: "Settings",
  },
  tab: { home: "Home", map: "Map", quick: "Quick", chat: "Chat", profile: "Account", aria: "Main menu" },
};

const zh: SiteDict = {
  intl: "zh-SG",
  common: { home: "首页", map: "地图", login: "登录", register: "立即注册", myAccount: "我的账户", myBookings: "我的预约", notifications: "通知", close: "关闭", later: "稍后再说", details: "查看详情", ad: "推广", advertise: "商务合作 ›", per3h: "/ 3小时", back: "返回", lang: "语言", soon: "预览 · 即将上线", years: (n) => `${n}岁`, cm: (n) => `${n}厘米`, people: (n) => `${n}人` },
  acts: { eat: "美食出游", massage: "放松按摩", cafe: "咖啡馆", photo: "摄影", movie: "看电影", gym: "健身", chill: "休闲小坐" },
  home: {
    metaTitle: "Mister Bamrungsuk — 选择您的社交伙伴",
    navHome: "首页", navSample: [["/join/showcase", "浏览伙伴"], ["/map", "地图"], ["/join/earnings", "收入"], ["/policy", "规则"], ["/work-with-us", "加入我们"]],
    joinTeam: "加入团队",
    hello: (n) => `您好，${n} 👋`,
    sampleTag: "预览页 · 客户在App中看到的内容",
    title: "选择您的社交伙伴", titleSample: "我们App中的美食出游伙伴",
    sampleCta: "想成为这样的伙伴吗？", sampleFee: (p) => `报名费 ${p} 起（含培训）· 时间自由安排`,
    shop: [["酒店 · 水疗", "会员价"], ["商品", "送货上门"]], shopNav: "服务与商品",
    work: "与我们合作", apply: "报名 →",
    search: "搜索姓名、区域或活动", searchLbl: "搜索", onMap: "在地图上查看", filters: "筛选",
    sorts: { top: "推荐 · TOP优先", rate: "评分最高", price: "价格" },
    friends: "平台伙伴", groupTabs: "类别", man: "帅气男士", tom: "帅气Tom", found: (n) => `共${n}位`,
    featured: "★ 推荐",
    tomSoon: "帅气Tom · 即将推出", tomSoonSub: "首批招募进行中", tomApply: "报名成为Tom ›",
    empty: "暂无符合条件的伙伴，请尝试减少所选活动。",
    adsLbl: "精选优惠", adN: (i, n, name) => `优惠 ${i}/${n} · ${name}`, adDot: (i) => `查看第${i}个优惠`, unread: (n) => `${n}条未读`,
    slides: [
      { kind: "合作水疗 · 是隆", name: "Bamrungsuk 水疗", offer: "会员享8折" },
      { kind: "合作酒店 · 沙吞", name: "The Sathorn Retreat", offer: "会员专享房价" },
      { kind: "合作度假村 · 华欣", name: "Seaside Villa", offer: "海滨住宿 · 会员享85折" },
    ],
    midAds: [
      { name: "The Sathorn Retreat", sub: "会员专享房价" },
      { name: "Bamrungsuk 水疗", sub: "会员享8折" },
      { name: "Gold Box 礼盒", sub: "高端礼品 · 送货上门" },
      { name: "Seaside Villa", sub: "海滨住宿 · 会员享85折" },
      { name: "薰衣草身体按摩油", sub: "放松按摩油" },
    ],
    footAd: "有机按摩油", footAdSub: "在商城购买 ›",
    promoAria: "Gold / Black 会员优惠",
    promoGold: (pay, credit) => ["Gold 会员", `支付 ${pay}`, `得 ${credit}`],
    promoBlack: (pay, credit) => `Black：支付 ${pay} 得 ${credit} · 积分加倍 · 会员卡`,
    promoCta: "查看会员优惠 ›",
    recruitTag: "加入我们", recruitTitle: "成为 Mister Bamrungsuk 美食出游伙伴", recruitApply: "报名兼职", recruitEarn: "查看收入与分成",
    memberTitle: "开通会员，立即获得额外额度", pay: (v) => `支付 ${v}`, get: (v) => `得 ${v}`,
    memberPerks: ["额度可用于预约伙伴、水疗、酒店及商品", "每笔消费积分加倍", "专属等级配色 + 数字会员卡"], memberCta: "查看会员优惠",
    fTitle: "筛选伙伴", fRegion: "地区", fProv: "府", fAllProv: "全部府", fSpot: "区域，如 素坤逸、拉抛、沙吞、邦纳", fSpotLbl: "区域",
    regions: [["", "全部地区"], ["bkk", "曼谷及中部"], ["north", "北部"], ["ne", "东北部"], ["south", "南部"]],
    fType: "类型", types: [["", "全部类型"], ["eat", "美食出游"], ["massage", "按摩"]],
    fTier: "等级", allTiers: "全部等级", fAct: "活动", allActs: "全部活动", fAge: "年龄范围（岁）", ageMin: "最小年龄", ageMax: "最大年龄", clear: "清除", go: (n) => `查看 ${n} 位伙伴`,
    tabSample: { see: "伙伴", earn: "收入", rules: "规则", team: "加入" },
  },
  profile: {
    preview: "即将开放预约", previewSample: "预览 · 即将上线",
    fav: "收藏", photo: (i) => `第${i}张照片`, featured: "★ 推荐", verified: "✓ 已实名认证 + 背景审查",
    newRating: "新", reviewsN: (n) => `${n}条评价`, newPt: "新伙伴", trained: "已培训", training: "待培训", idOk: "已认证", tier: "等级",
    jobs: "完成预约", exp: "经验", reply: "回复率",
    freeToday: "今日有空", liked: "✓ 已感兴趣", like: "感兴趣", likedNote: (n) => `${n}会看到您感兴趣 · 想见面请点"立即预约"`, likeNote: (n) => `告诉${n}您感兴趣（不公开联系方式）`, likeErr: "操作失败，请重试",
    about: (n) => `关于${n}`, service: "选择服务", hours: (h) => `${h}小时约会`, h3: "用餐、出游、咖啡馆、看电影", h5: "半天包时 · 活动可随意切换",
    reviews: "评价", noReviews: "暂无评价 · 首次预约结束后显示评价", fromN: (n) => `共${n}条评价（真实预约客户）`, allReviews: "查看全部评价 ›", daysAgo: "3天前", sampleReview: "准时、非常有礼貌，聊得很愉快，还推荐了好吃的餐厅。",
    noteReal: "预约款项由平台托管至约会结束 · 伙伴接受后即可聊天", noteSample: "示例资料 · 请在首页选择可预约的伙伴",
    hShort: (h) => `${h}小时`, chat: "聊天", chatWith: (n) => `与${n}聊天`, book: "立即预约",
  },
  map: {
    metaTitle: "地图 — Mister Bamrungsuk", aria: "伙伴与合作场所地图", search: "搜索区域，如 阿速、通罗", searchLbl: "搜索区域",
    layers: { all: "全部", p: "伙伴", v: "合作方" }, count: (p, v) => [`${p}`, " 位伙伴 · ", `${v}`, " 家合作方"],
    locate: "前往我的位置", fit: "查看全部", away: (d) => ` · 约 ${d}`, profile: "查看资料",
    venue: (s) => `合作场所 · 水疗${s ? "（示例）" : ""}`, venueNote: "可约伙伴来此见面（即将开放预约）",
    none: "该区域暂无结果，请尝试其他区域或取消筛选。", sample: "示例数据 · 地图位置为大致区域，非精确位置",
  },
  work: {
    metaTitle: "与我们合作 — Mister Bamrungsuk", title: "与我们合作", ptLogin: "已有兼职资料？登录 ›",
    paths: [
      { title: "美食出游伙伴", sub: "兼职工作，时间自由安排", go: "报名兼职 ›" },
      { title: "水疗与酒店", sub: "通过平台接待高端客户", go: "成为合作伙伴 ›" },
      { title: "开设商店", sub: "向高端客户销售商品", go: "开始销售 ›" },
    ],
    contact: "联系我们", terms: "使用条款", privacy: "隐私政策（PDPA）",
  },
  soon: {
    metaTitle: "即将上线 — Mister Bamrungsuk", title: "即将上线", body: "目前正在招募 Mister Bamrungsuk 美食出游兼职伙伴，预约及其他服务即将开放。",
    apply: "报名兼职", ptLogin: "兼职伙伴登录", home: "返回首页",
  },
  footer: {
    cols: [
      { title: "客户服务", links: [["/", "寻找伙伴"], ["/map", "地图"], ["/quick", "快速匹配"], ["/stay", "酒店 · 水疗"], ["/market", "商城"], ["/orders/track", "订单查询"]] },
      { title: "与我们合作", links: [["/join", "报名兼职"], ["/join/earnings", "兼职收入"], ["/join/showcase", "App预览"], ["/join/me", "兼职伙伴登录"], ["/partner", "水疗 · 酒店合作"], ["/vendor", "开设商店"]] },
      { title: "帮助与政策", links: [["/page/terms", "使用条款"], ["/privacy", "隐私政策（PDPA）"], ["/policy", "规则与安全"], ["/sos", "SOS紧急求助"]] },
    ],
    short: [["/page/terms", "条款"], ["/privacy", "隐私"], ["/policy", "规则"], ["/work-with-us", "与我们合作"]],
    keyLinks: "重要链接", tel: "电话", about: "高端美食出游伙伴，均经过培训与实名认证 · 平台内付款，款项托管至约会结束",
    rights: "版权所有", reg: (n) => `公司注册号 ${n}`, buddhist: false,
  },
  cookie: {
    aria: "Cookie设置", text: "我们使用必要的Cookie以确保App正常运行，并请求您允许使用分析/营销Cookie以改进服务。", privacy: "隐私政策", terms: "条款",
    need: ["必要", "登录、安全与预约（无法关闭）"], stats: ["使用分析", "匿名统计，用于改进App"], mkt: ["营销", "广告像素，用于展示相关优惠"],
    all: "全部接受", needOnly: "仅必要", save: "保存设置", settings: "设置",
  },
  tab: { home: "首页", map: "地图", quick: "快速", chat: "聊天", profile: "账户", aria: "主菜单" },
};

export const SITE: Record<SiteLang, SiteDict> = { th, en, zh };

// ── ชื่อย่าน/จังหวัด (ข้อมูลในการ์ด) · ไม่มีในตาราง = แสดงตามเดิม ──
const PLACES: Record<string, [string, string]> = {
  "กรุงเทพฯ": ["Bangkok", "曼谷"], "นนทบุรี": ["Nonthaburi", "暖武里"], "ปทุมธานี": ["Pathum Thani", "巴吞他尼"], "สมุทรปราการ": ["Samut Prakan", "北榄"],
  "ชลบุรี": ["Chonburi", "春武里"], "พัทยา": ["Pattaya", "芭提雅"], "เชียงใหม่": ["Chiang Mai", "清迈"], "ภูเก็ต": ["Phuket", "普吉"], "ขอนแก่น": ["Khon Kaen", "孔敬"],
  "หัวหิน": ["Hua Hin", "华欣"], "ประจวบคีรีขันธ์": ["Prachuap Khiri Khan", "巴蜀"], "เชียงราย": ["Chiang Rai", "清莱"], "กระบี่": ["Krabi", "甲米"], "สุราษฎร์ธานี": ["Surat Thani", "素叻他尼"],
  "ชิดลม": ["Chit Lom", "奇隆"], "ทองหล่อ": ["Thong Lo", "通罗"], "นิมมาน": ["Nimman", "宁曼"], "บางนา": ["Bang Na", "邦纳"], "ปทุมวัน": ["Pathum Wan", "巴吞旺"],
  "ปิ่นเกล้า": ["Pin Klao", "宾告"], "พระราม 9": ["Rama 9", "拉玛九"], "รัชดา": ["Ratchada", "拉差达"], "ราชเทวี": ["Ratchathewi", "拉差贴威"], "ลาดพร้าว": ["Lat Phrao", "拉抛"],
  "วัฒนา": ["Watthana", "瓦塔纳"], "สยาม": ["Siam", "暹罗"], "สาทร": ["Sathorn", "沙吞"], "สีลม": ["Silom", "是隆"], "สุขุมวิท": ["Sukhumvit", "素坤逸"], "สุขุมวิท 24": ["Sukhumvit 24", "素坤逸24巷"],
  "อารีย์": ["Ari", "阿里"], "อโศก": ["Asok", "阿速"], "เจริญกรุง": ["Charoen Krung", "石龙军路"], "เพลินจิต": ["Phloen Chit", "奔集"], "เอกมัย": ["Ekkamai", "伊卡迈"],
  "เมืองขอนแก่น": ["Khon Kaen City", "孔敬市"], "เมืองภูเก็ต": ["Phuket Town", "普吉镇"], "บางรัก": ["Bang Rak", "挽叻"], "คลองเตย": ["Khlong Toei", "空堤"], "ห้วยขวาง": ["Huai Khwang", "辉煌"],
  "จตุจักร": ["Chatuchak", "乍都乍"], "พญาไท": ["Phaya Thai", "帕亚泰"], "ดินแดง": ["Din Daeng", "丁当"], "บางกะปิ": ["Bang Kapi", "邦卡比"], "ประเวศ": ["Prawet", "巴威"],
  "สวนหลวง": ["Suan Luang", "颂銮"], "ยานนาวา": ["Yan Nawa", "然那华"], "บางซื่อ": ["Bang Sue", "挽赐"], "หลักสี่": ["Lak Si", "叻四"], "บางเขน": ["Bang Khen", "挽卿"],
};
/** แปลชื่อย่าน "สีลม · กรุงเทพฯ" / "แถวอโศก" ตามภาษา */
export function placeT(s: string, lang: SiteLang): string {
  if (lang === "th" || !s) return s;
  const i = lang === "en" ? 0 : 1;
  return s.split(" · ").map((part) => {
    const near = part.startsWith("แถว");
    const core = near ? part.slice(3) : part;
    const t = PLACES[core]?.[i] ?? core;
    return near ? (lang === "en" ? `near ${t}` : `${t}附近`) : t;
  }).join(" · ");
}

// ── เพื่อนตัวอย่าง (mockup): ชื่อ + แนะนำตัวภาษาอังกฤษ/จีน · คนจริงแสดงตามที่กรอกเอง ──
const SAMPLE_BIO: Record<string, [string, string]> = {
  ton: ["Loves trying new restaurants, great to talk to and a good listener. Takes nice photos and is a certified relaxation masseur.", "喜欢带您尝试新餐厅，健谈又善于倾听，拍照好看，持证放松按摩。"],
  phum: ["Health-minded — light exercise followed by a good meal. Calm and always on time.", "注重健康，先轻松运动再享用美食，性格沉稳、准时。"],
  benz: ["Great photographer who knows the prettiest cafés in Bangkok. Easy to talk to about anything.", "擅长摄影，熟知曼谷最美的咖啡馆，什么话题都能聊。"],
  golf: ["Calm and a good listener. Enjoys quiet cafés and conversations about books and art.", "沉稳、善于倾听，喜欢安静的咖啡馆，聊书籍与艺术。"],
  non: ["Chiang Mai local — shows you Nimman, hidden spots and sunset viewpoints.", "清迈本地人，带您逛宁曼路、隐藏小店和日落观景点。"],
  pan: ["Seaside lover — beachfront seafood followed by a late-night movie.", "热爱海边，带您吃海滨海鲜，再看一场深夜电影。"],
  kla: ["Smiles easily and is friendly. Knows the hidden bars of Sukhumvit.", "爱笑、亲切，熟悉素坤逸的隐藏酒吧。"],
  tae: ["Fine-dining type, well dressed — a great plus-one for events and business dinners.", "高级晚宴型，衣着得体，适合陪同出席活动或商务晚宴。"],
  mark: ["A true coffee lover — specialty café hopping, then a relaxed dinner.", "真正的咖啡爱好者，带您探访精品咖啡馆，再享用轻松晚餐。"],
  film: ["Warm and attentive to detail. Suggests candlelit dinners with great atmosphere.", "温暖细心，推荐氛围极佳的烛光晚餐。"],
  james: ["Loves rooftop bars and city views at night. Fun to talk to and takes great photos.", "喜欢屋顶酒吧和城市夜景，聊天有趣，擅长拍照。"],
  ice: ["Cheerful movie and game fan — special screenings followed by a café.", "开朗的电影与游戏爱好者，看特别场后再去咖啡馆。"],
  best: ["Fitness lover — morning runs in the park, then brunch.", "健身达人，清晨公园慢跑，然后享用早午餐。"],
  art: ["Into art and wine — gallery walks followed by a cosy wine bar.", "热爱艺术与葡萄酒，逛画廊后去氛围很好的酒吧。"],
  nick: ["Phuket local — Old Town, local food and sunsets.", "普吉本地人，带您逛老城、品尝当地美食、看日落。"],
  tim: ["Kind and well spoken. Enjoys long, unhurried conversations by the river.", "善良、谈吐得体，喜欢在河边悠闲长谈。"],
  first: ["Certified in Thai massage — helps you unwind after a long day out.", "持泰式按摩证书，帮您在一天游玩后放松身心。"],
  oat: ["A foodie who knows the best spots, from street food to fine dining.", "资深吃货，从街头小吃到高级料理都了如指掌。"],
  boss: ["Polite and mature — ideal for dinners and social events.", "礼貌稳重，适合晚宴或社交场合。"],
  win: ["Friendly — cafés and night markets around Khon Kaen.", "亲切友善，带您逛孔敬的咖啡馆和夜市。"],
  "t-june": ["Polite and calm. Loves dinners with a view; a good talker and listener.", "礼貌温和，喜欢有景观的晚餐，健谈也善于倾听。"],
  "t-beam": ["Café lover who knows hidden coffee shops all over Bangkok.", "咖啡馆爱好者，熟知曼谷各处隐藏咖啡店。"],
  "t-tan": ["Loves rooftop bars and relaxing with a city view. Fun to talk to.", "喜欢屋顶酒吧，欣赏城市景色，聊天有趣。"],
  "t-mew": ["Great photographer who enjoys galleries and art.", "擅长摄影，喜欢画廊与艺术。"],
  "t-pat": ["Polite and composed — ideal for upscale Thai dinners.", "举止得体，适合高档泰餐晚宴。"],
  "t-jam": ["Night-market fan — let's hunt down great food.", "夜市达人，带您寻找美食。"],
  "t-chin": ["Loves jazz bars, good music and great atmosphere.", "喜欢爵士酒吧，好音乐、好氛围。"],
  "t-sun": ["Health-minded — a workout, then something delicious.", "注重健康，运动后再去享用美食。"],
  "t-toon": ["Pattaya local — beaches and sunsets.", "芭提雅本地人，带您看海、看日落。"],
  "t-gift": ["Movie buff — a late screening followed by dinner.", "电影迷，看深夜场再共进晚餐。"],
  "t-ploy": ["Loves bookstore cafés and can talk about books all day.", "喜欢书店咖啡馆，可以聊一整天书。"],
  "t-boat": ["Cool and stylish. Enjoys evening walks and hidden spots.", "帅气有型，喜欢夜晚散步，带您去隐藏小店。"],
  "t-earth": ["Romantic dinner cruises along the Chao Phraya River.", "湄南河浪漫晚餐游船。"],
  "t-nice": ["Chiang Mai local — beautiful garden cafés.", "清迈本地人，带您去漂亮的花园咖啡馆。"],
  "t-palm": ["Calm and mature — ideal for events or hotel dinners.", "沉稳成熟，适合出席活动或酒店晚宴。"],
  "t-bow": ["Party lover, fun and easy to get along with.", "派对达人，有趣、容易相处。"],
  "t-pin": ["Into golf and sports — a round of golf, then relaxing.", "喜欢高尔夫与运动，打完球再一起放松。"],
  "t-jiw": ["Craft beer fan — easy-going and fun to talk to.", "精酿啤酒爱好者，随和健谈。"],
  "t-fah": ["Loves Japanese food — knows the best izakayas.", "喜欢日本料理，熟知好吃的居酒屋。"],
  "t-kaew": ["Enjoys museums and exhibitions; takes beautiful photos.", "喜欢博物馆和展览，拍照很美。"],
};
/** ชื่อเล่นตัวอย่างเป็นอักษรโรมัน (id = ชื่อ เช่น "t-june" → June) · คนจริง = ชื่อที่กรอกเอง */
export const sampleNick = (p: { id: string; nick: string; real?: boolean }, lang: SiteLang) =>
  lang === "th" || p.real || !SAMPLE_BIO[p.id] ? p.nick : p.id.replace(/^t-/, "").replace(/^./, (c) => c.toUpperCase());
export const sampleBio = (p: { id: string; bio: string; real?: boolean }, lang: SiteLang) =>
  lang === "th" || p.real ? p.bio : SAMPLE_BIO[p.id]?.[lang === "en" ? 0 : 1] ?? p.bio;
