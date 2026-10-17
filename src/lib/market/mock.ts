// ─────────────────────────────────────────────────────────────
//  แคตตาล็อกตัวอย่าง (mockup) ของ Marketplace — ตามบอร์ดดีไซน์ Market / ProductList / ProductDetail / VendorShop
//  ใช้เมื่อ "ยังไม่มีสินค้าจริงที่เผยแพร่" เท่านั้น (ดู shopCatalog() ใน catalog.ts) — มีสินค้าจริงแม้ 1 ชิ้น = ไม่แสดงชุดนี้เลย
//  ไฟล์นี้ไม่มี server-only เพื่อให้ตะกร้า (client) รู้จักสินค้าตัวอย่าง และบล็อกการสั่งซื้อได้
//  ข้อมูลทั้งหมดเป็นตัวอย่าง: ไม่ใช่ราคา/เลข อย./รีวิวจริง · สั่งซื้อไม่ได้ (createOrder + ตะกร้าบล็อกไว้)
// ─────────────────────────────────────────────────────────────
import type { Banner, Category, Product, Review, Vendor } from "./config";

export const MOCK_PREFIX = "mock-";
export const isMockId = (id: string | null | undefined) => !!id && id.startsWith(MOCK_PREFIX);
export const SAMPLE_NOTE = "* สินค้าตัวอย่าง รอสินค้าจริงจากร้านค้าพาร์ทเนอร์";
export const SAMPLE_BLOCK = "สินค้าตัวอย่าง ยังสั่งซื้อไม่ได้";

const IMG = (f: string) => `/brand/market/${f}`;
const T0 = Date.parse("2026-10-01T03:00:00Z");
const at = (k: number) => new Date(T0 + k * 60_000).toISOString();

export const MOCK_CATEGORIES: Category[] = [
  { id: "mock-c-sup", name: "เสริมอาหาร", slug: "supplement", sort: 1 },
  { id: "mock-c-beauty", name: "ความงาม", slug: "beauty", sort: 2 },
  { id: "mock-c-spa", name: "สปา · ผ่อนคลาย", slug: "spa", sort: 3 },
  { id: "mock-c-gift", name: "ชุดของขวัญ", slug: "gift", sort: 4 },
];

export const MOCK_VENDORS: Vendor[] = [
  { id: "mock-v-mohso", name: "คลินิกหมอโส", slug: "sample-mohso", contact: "", gp_pct: null, created_at: at(0), logo: null, sample: true,
    description: "ร้านจำหน่ายผลิตภัณฑ์เสริมอาหารนำเข้าที่มีเลข อย. ทุกรายการ คัดสรรโดยทีมคลินิก · ฉลากภาษาไทยครบ แพ็กมิดชิดทุกออเดอร์\n(ข้อมูลร้านตัวอย่าง — รอรายละเอียดจริงจากร้านค้า)" },
  { id: "mock-v-siamherb", name: "Siam Herb", slug: "sample-siam-herb", contact: "", gp_pct: null, created_at: at(1), logo: null, sample: true,
    description: "แบรนด์ผลิตภัณฑ์เสริมอาหารจากสมุนไพรและวิตามิน สำหรับคนเมืองที่ใส่ใจการดูแลตัวเองในทุกวัน\n(ข้อมูลร้านตัวอย่าง — รอรายละเอียดจริงจากร้านค้า)" },
  { id: "mock-v-serenity", name: "Siam Serenity Spa", slug: "sample-siam-serenity-spa", contact: "", gp_pct: null, created_at: at(2), logo: null, sample: true,
    description: "สปาพาร์ทเนอร์ที่นำกลิ่นและน้ำมันที่ใช้ในร้าน มาให้ผ่อนคลายต่อได้ที่บ้าน · เครื่องสำอางจดแจ้งถูกต้อง\n(ข้อมูลร้านตัวอย่าง — รอรายละเอียดจริงจากร้านค้า)" },
  { id: "mock-v-joopz", name: "Joopz+", slug: "sample-joopz", contact: "", gp_pct: null, created_at: at(3), logo: null, sample: true,
    description: "ซินไบโอติกรสช็อกโกแลต 0% น้ำตาล นำเข้าส่วนผสมจากสหรัฐอเมริกา\n(ข้อมูลร้านตัวอย่าง — รอรายละเอียดจริงจากร้านค้า)" },
  { id: "mock-v-mb", name: "Mister Bamrungsuk", slug: "sample-mister-bamrungsuk", contact: "", gp_pct: null, created_at: at(4), logo: null, sample: true,
    description: "ของขวัญและของที่ระลึกที่ทีม Mister Bamrungsuk คัดมาเอง · รายการในชุด [รอกำหนด]\n(ข้อมูลร้านตัวอย่าง)" },
];

const SUP_WARN = "ควรกินอาหารหลากหลาย ครบ 5 หมู่ ในสัดส่วนที่เหมาะสมเป็นประจำ · เด็ก สตรีมีครรภ์ หรือผู้มีโรคประจำตัว ควรปรึกษาแพทย์ก่อนรับประทาน";
const COS_WARN = "ใช้ภายนอกเท่านั้น · ทดสอบที่ท้องแขนก่อนใช้ หากระคายเคืองให้หยุดใช้ · เก็บให้พ้นมือเด็ก";
const NOTE = "\n\n(ข้อมูลตัวอย่าง — รอรายละเอียด ราคา รูป และเลข อย. จริงจากร้านค้า)";

type Row = [id: string, vendor: string, cat: string, name: string, price: number, stock: number, img: string, fda: string, desc: string, warn: string, age?: boolean, bundle?: string[]];
// ลำดับตามบอร์ด ProductList (แนะนำ)
const ROWS: Row[] = [
  ["mock-jz", "mock-v-joopz", "mock-c-sup", "Joopz+ Plus Synbio", 990, 40, "joopz-plus.jpg", "[ตัวอย่าง] 13-1-XXXXX-X-XXXX",
    "ซินไบโอติก (โพรไบโอติก + พรีไบโอติก) รสช็อกโกแลตผสมโกโก้ · 0% น้ำตาล · ชงดื่มง่าย 1 ซองต่อวัน · 30 ซอง", SUP_WARN, false, ["mock-fb"]],
  ["mock-lh", "mock-v-mohso", "mock-c-sup", "Love Hormone (นำเข้า)", 1290, 24, "love-hormone.jpg", "[ตัวอย่าง] 10-3-XXXXX-X-XXXX",
    "ผลิตภัณฑ์เสริมอาหารนำเข้าจากสหรัฐอเมริกา 30 แคปซูล คัดสรรโดยคลินิกหมอโส · ฉลากภาษาไทยครบ · ผู้นำเข้า: คลินิกหมอโส [รอข้อมูล]", SUP_WARN, true, ["mock-cl"]],
  ["mock-cl", "mock-v-mohso", "mock-c-beauty", "Collagen Night", 890, 35, "collagen-night.jpg", "[ตัวอย่าง] 10-3-XXXXX-X-XXXX",
    "คอลลาเจนชนิดผงสำหรับดื่มก่อนนอน กลิ่นเบอร์รี่ ละลายง่าย · 15 ซอง", SUP_WARN, false, ["mock-ct"]],
  ["mock-ct", "mock-v-mohso", "mock-c-sup", "Chamomile Tea Blend", 390, 60, "chamomile-tea.jpg", "[ตัวอย่าง] 10-3-XXXXX-X-XXXX",
    "ชาดอกคาโมมายล์ผสมตะไคร้และเปลือกส้ม กลิ่นหอมอ่อน ๆ เหมาะกับช่วงพักผ่อน · 20 ซองชา", SUP_WARN],
  ["mock-gs", "mock-v-siamherb", "mock-c-sup", "Ginseng Gold", 1590, 18, "ginseng-gold.jpg", "[ตัวอย่าง] 10-1-XXXXX-X-XXXX",
    "สารสกัดโสมเกาหลีชนิดแคปซูล สำหรับคนทำงานที่ต้องการดูแลตัวเองในวันที่ยุ่ง · 60 แคปซูล", SUP_WARN, false, ["mock-vc"]],
  ["mock-vc", "mock-v-siamherb", "mock-c-sup", "Vitamin C 1000", 490, 80, "vitamin-c.jpg", "[ตัวอย่าง] 10-1-XXXXX-X-XXXX",
    "วิตามินซี 1,000 มก. ชนิดเม็ด ทานวันละ 1 เม็ดหลังอาหาร · 30 เม็ด", SUP_WARN],
  ["mock-fb", "mock-v-siamherb", "mock-c-sup", "Fiber Plus", 590, 45, "fiber-plus.jpg", "[ตัวอย่าง] 10-1-XXXXX-X-XXXX",
    "ใยอาหารชนิดผงจากพืช ผสมน้ำดื่มง่าย ไม่มีน้ำตาล · 10 ซอง", SUP_WARN],
  ["mock-bo", "mock-v-serenity", "mock-c-spa", "Body Oil ลาเวนเดอร์", 650, 30, "body-oil-lavender.jpg", "[ตัวอย่าง] เลขจดแจ้ง 10-1-XXXXXXXXXX",
    "น้ำมันบำรุงผิวกายกลิ่นลาเวนเดอร์ สูตรเดียวกับที่ใช้ในร้าน Siam Serenity Spa เนื้อบางเบา ซึมไว · 100 มล.", COS_WARN, false, ["mock-ct"]],
  ["mock-gb", "mock-v-mb", "mock-c-gift", "ชุดของขวัญ Gold Box", 1990, 12, "gold-box.jpg", "[ตัวอย่าง] สินค้าในชุดมีเลข อย. ทุกชิ้น",
    "กล่องของขวัญโทนทอง รวมสินค้าคัดสรรจากร้านพาร์ทเนอร์ พร้อมการ์ดเขียนข้อความ · รายการในชุด [รอกำหนด]", SUP_WARN],
];

/** สินค้าตัวอย่าง — created_at เรียงเก่า→ใหม่ เหมือน listPublished() (หน้าเว็บ reverse แล้วได้ลำดับตามบอร์ด) */
export const MOCK_PRODUCTS: Product[] = ROWS.map(([id, vendor_id, category_id, name, price, stock, img, fda_no, desc, warning, age, bundle], k) => ({
  id, vendor_id, category_id, name, price, stock, images: [IMG(img)], fda_no, description: desc + NOTE, warning,
  age_restricted: !!age, published: true, approved: true, bundle_ids: bundle ?? [], created_at: at(100 - k), sample: true,
})).reverse();

/** สินค้าแนะนำบนหน้า /market (บอร์ด Market: การ์ด Joopz+ ใหญ่) */
export const MOCK_FEATURED = { id: "mock-jz", image: IMG("joopz-plus-feature.jpg"), title: "Joopz+ Plus Synbio", sub: "ซินไบโอติก รสช็อกโกแลต · 0% น้ำตาล · มี อย.", price: 990 };

/** แบนเนอร์ตัวอย่าง (บอร์ด Market) — ลิงก์ไปสินค้าตัวอย่าง จึงใช้เฉพาะตอนแคตตาล็อกเป็นตัวอย่าง */
export const MOCK_BANNERS: Banner[] = [
  { id: "mock-b-ship", title: "ส่งฟรีเมื่อซื้อครบ ฿1,500", subtitle: "โปรตัวอย่าง · เงื่อนไขจริงรอประกาศ", image: IMG("banner-room.jpg"), link: "/products", sort: 1, active: true },
  { id: "mock-b-gift", title: "ชุดของขวัญ Gold Box", subtitle: "฿1,990 · กล่องของขวัญโทนทอง (ตัวอย่าง)", image: IMG("gold-box.jpg"), link: "/products/mock-gb", sort: 2, active: true },
  { id: "mock-b-spa", title: "Body Oil จาก Siam Serenity Spa", subtitle: "฿650 · สปาที่บ้าน (ตัวอย่าง)", image: IMG("body-oil-lavender.jpg"), link: "/products/mock-bo", sort: 3, active: true },
];

// รีวิวตัวอย่าง (บอร์ด ProductDetail / VendorShop) — วันที่คิดย้อนจากวันนี้ตอนเรียก
type RV = [product: string, stars: number, daysAgo: number, text: string, who: string];
const RVS: RV[] = [
  ["mock-lh", 5, 2, "แพ็กมาดีมาก กล่องเรียบ ไม่มีชื่อสินค้า ส่งไว", "สมชาย ใ."],
  ["mock-lh", 4, 7, "ฉลากภาษาไทยครบ มีเลข อย. ชัดเจน", "วิภา ส."],
  ["mock-lh", 5, 14, "ร้านตอบแชทเร็ว จัดส่งตามเวลา", "อนันต์ ก."],
  ["mock-lh", 3, 21, "ขนส่งช้ากว่าที่แจ้ง 1 วัน แต่ของครบ", "ศิริ ม."],
  ["mock-lh", 5, 32, "ซื้อซ้ำรอบที่สอง บรรจุภัณฑ์ดี", "ธนา ป."],
  ["mock-cl", 4, 7, "ร้านตอบแชทเร็ว ฉลากภาษาไทยครบ", "วิภา ส."],
  ["mock-cl", 5, 12, "ชงง่าย ไม่เป็นก้อน รสชาติดี", "กมล ร."],
  ["mock-ct", 5, 21, "รสชาติชาหอม ชงง่าย", "อนันต์ ก."],
  ["mock-ct", 4, 40, "กลิ่นหอมอ่อน ๆ ดื่มก่อนนอนสบาย", "พิมพ์ ช."],
  ["mock-jz", 5, 3, "รสช็อกโกแลตอร่อย ไม่หวานเกินไป", "ณัฐ พ."],
  ["mock-jz", 5, 9, "ซองพกพาสะดวก ชงกับน้ำเย็นได้", "ปวีณา ท."],
  ["mock-jz", 4, 18, "ส่งไว แพ็กดี", "ชัย ว."],
  ["mock-gs", 5, 5, "แพ็กมิดชิด ของถึงไว", "วรวุฒิ จ."],
  ["mock-gs", 4, 26, "ฉลากชัดเจน มีวันหมดอายุครบ", "สุดา ล."],
  ["mock-vc", 5, 4, "ราคาโอเค เม็ดไม่ใหญ่ ทานง่าย", "เอก ส."],
  ["mock-vc", 4, 15, "ส่งเร็ว กล่องเรียบร้อย", "นิด ก."],
  ["mock-fb", 4, 11, "ละลายน้ำง่าย ไม่มีกลิ่น", "แพร ม."],
  ["mock-bo", 5, 6, "กลิ่นเหมือนที่ร้านเลย ซึมไว ไม่เหนอะ", "มายด์ ร."],
  ["mock-bo", 5, 19, "ขวดสวย เหมาะเป็นของฝาก", "ต้น อ."],
  ["mock-gb", 5, 8, "กล่องสวยมาก ให้เป็นของขวัญได้เลย", "ปุ้ย ส."],
  ["mock-gb", 4, 30, "ห่อมาดี มีการ์ดให้เขียน", "บอย ท."],
];
export function mockReviews(now = Date.now()): Review[] {
  return RVS.map(([product_id, stars, d, text, name], k) => ({
    id: `mock-r-${k}`, product_id, order_id: "", phone: "", name, stars, text, hidden: false, created_at: new Date(now - d * 86_400_000).toISOString(),
  }));
}
