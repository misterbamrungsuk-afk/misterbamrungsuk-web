// ─────────────────────────────────────────────────────────────
//  Marketplace (หน้าแรก) — ค่าคงที่ + ชนิดข้อมูล ใช้ได้ทั้งฝั่งเว็บและเซิร์ฟเวอร์
//  GP % ต่อ vendor ตั้งในหลังบ้าน /admin/market (null = [รอกำหนด])
// ─────────────────────────────────────────────────────────────

export const ORDER_STATUSES = ["pending", "paid", "shipped", "done", "rejected"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "รอตรวจสลิป",
  paid: "ยืนยันแล้ว",
  shipped: "จัดส่งแล้ว",
  done: "สำเร็จ",
  rejected: "ปฏิเสธ",
};

export const GP_PENDING = "รอกำหนด";
export const CART_KEY = "mb_cart";
export const MAX_QTY = 20;

/** คำเตือนทั่วไปของสินค้าหมวดนี้ (แสดงหน้า /products/[id] และตะกร้า) */
export const AGE_NOTICE = "สินค้าบางรายการจำหน่ายเฉพาะผู้มีอายุ 20 ปีขึ้นไป";
export const GENERAL_WARNING = "ผลิตภัณฑ์นี้ไม่ใช่ยา ไม่มีผลในการป้องกันหรือรักษาโรค ควรอ่านฉลากและคำเตือนก่อนใช้ หากมีโรคประจำตัวหรือใช้ยาอยู่ ควรปรึกษาแพทย์";

/** หมายเหตุสำหรับแอดมิน (ข้อกฎหมายโฆษณา) */
export const CLAIM_NOTE = "ห้ามใช้คำโฆษณาเกินจริง เช่น “รักษา”, “หายขาด”, “เพิ่มสมรรถภาพ 100%”, “เห็นผลทันที” — ข้อความต้องตรงกับที่ อย. อนุญาต และควรให้ทนายตรวจก่อนเผยแพร่";
export const BANNED_CLAIMS = ["รักษา", "หายขาด", "100%", "เห็นผลทันที", "การันตี", "ปลอดภัย 100", "ไม่มีผลข้างเคียง"];
export const flaggedClaims = (text: string) => BANNED_CLAIMS.filter((w) => text.includes(w));

export interface Vendor {
  id: string; name: string; contact: string; gp_pct: number | null; created_at: string;
  /** v2 — หน้าร้าน /shop/[slug] */
  slug?: string; description?: string; logo?: string | null;
  /** สินค้า/ร้านตัวอย่าง (mockup) — แสดงเมื่อยังไม่มีสินค้าจริง สั่งซื้อไม่ได้ */
  sample?: boolean;
}
export interface Product {
  id: string; vendor_id: string; name: string; description: string; warning: string;
  price: number; images: string[]; fda_no: string | null; stock: number;
  age_restricted: boolean; published: boolean; created_at: string;
  /** v2 — หมวดหมู่, แอดมินอนุมัติ (สินค้าที่ร้านเพิ่มเองเริ่มที่ false), ซื้อคู่กัน (แอดมินตั้ง ว่าง = อัตโนมัติ) */
  category_id?: string | null; approved?: boolean; bundle_ids?: string[];
  /** สินค้าตัวอย่าง (mockup) — ดู src/lib/market/mock.ts · ใส่ตะกร้าได้แต่สั่งซื้อไม่ได้ */
  sample?: boolean;
}
export interface OrderItem { product_id: string; vendor_id: string; name: string; price: number; qty: number }
export interface Order {
  id: string; order_no: string; buyer_name: string; phone: string; address: string;
  items: OrderItem[]; total: number; gp_pct: number | null; gp_amount: number | null; vendor_amount: number | null;
  slip_path: string | null; status: OrderStatus; tracking_no: string | null; admin_note: string | null;
  age_confirmed_at: string; ip: string; paid_at: string | null; decided_by: string | null; created_at: string;
  /** v2 — total = subtotal − discount + shipping_fee; GP คิดจาก (subtotal − discount) เท่านั้น */
  subtotal?: number; discount?: number; promo_code?: string | null; shipping_fee?: number;
  carrier?: string | null; shipped_at?: string | null; done_at?: string | null; reject_reason?: string | null;
  vendor_split?: VendorSplit[] | null; vendor_tracking?: VendorTracking;
  /** ลูกค้าที่ล็อกอินตอนสั่ง (ไว้ให้แต้มเมื่อออเดอร์สำเร็จ) · null = สั่งแบบไม่ล็อกอิน */
  customer_id?: string | null; customer_email?: string | null;
  slip_check?: unknown;
}
export type CartLine = { id: string; qty: number };

/** รูปสินค้า: path ใน storage → URL ผ่าน API (หรือ URL เต็ม/ไฟล์ใน public) */
export const imageUrl = (p: string | undefined) => (!p ? "" : /^(https?:)?\//.test(p) ? p : `/api/market/image?p=${encodeURIComponent(p)}`);

export const baht = (n: number) => n.toLocaleString("th-TH");
export const fmtPct = (n: number | null) => (n == null ? GP_PENDING : `${n}%`);

// ─────────────────────────────────────────────────────────────
//  v2: ค่าส่ง / โปรโมชั่น / หมวดหมู่ / รีวิว / แบนเนอร์ / ร้านค้า (vendor portal) / รอบโอน
// ─────────────────────────────────────────────────────────────
export const TBD = "[รอกำหนด]";
export const DISCREET = "แพ็กมิดชิด ไม่ระบุชื่อสินค้าหน้ากล่อง";
export const TRUST_POINTS = ["ของแท้", "มี อย.", "นำเข้าถูกต้อง", "ส่งจากร้านที่ตรวจสอบแล้ว"];

export interface Category { id: string; name: string; slug: string; sort: number }
export interface Review { id: string; product_id: string; order_id: string; phone: string; name: string; stars: number; text: string; hidden: boolean; created_at: string }
export interface Banner { id: string; title: string; subtitle: string; image: string; link: string; sort: number; active: boolean }
export interface Promo {
  id: string; code: string; kind: "percent" | "fixed"; value: number; min_spend: number;
  expires_at: string | null; usage_limit: number | null; used_count: number; active: boolean; created_at: string;
}
/** null = [รอกำหนด] (ถือเป็น 0 / ไม่มีเงื่อนไข และแสดงป้าย) */
export interface MarketSettings {
  shipping_fee: number | null;
  free_threshold: number | null;
  delivery_days: string;
  policy_returns: string;
  policy_shipping: string;
  policy_privacy: string;
  line_notify_url: string;
}
export const DEFAULT_SETTINGS: MarketSettings = {
  shipping_fee: null, free_threshold: null, delivery_days: TBD,
  policy_returns: "", policy_shipping: "", policy_privacy: "", line_notify_url: "",
};
export interface VendorAccount { id: string; vendor_id: string; email: string; password_hash: string | null; invited_at: string; last_login_at: string | null }
export interface Payout {
  id: string; vendor_id: string; month: string; gross: number; discount: number; gp: number; shipping: number; amount: number;
  paid_at: string; ref: string; slip_path: string | null; recorded_by: string; created_at: string;
}
/** ส่วนแบ่งต่อร้านในออเดอร์ (คิดตอนยืนยันชำระ) — gp=null ถ้าร้านยังไม่ตั้ง GP */
export interface VendorSplit { vendor_id: string; gross: number; discount: number; net: number; gp_pct: number | null; gp: number | null; shipping: number; payout: number | null }
export type VendorTracking = Record<string, { tracking_no: string; carrier: string; at: string }>;

export const CARRIERS: { key: string; name: string; url: (no: string) => string }[] = [
  { key: "thaipost", name: "ไปรษณีย์ไทย", url: (n) => `https://track.thailandpost.co.th/?trackNumber=${encodeURIComponent(n)}` },
  { key: "kerry", name: "Kerry Express", url: (n) => `https://th.kex-express.com/th/track/?track=${encodeURIComponent(n)}` },
  { key: "flash", name: "Flash Express", url: (n) => `https://www.flashexpress.co.th/fle/tracking?se=${encodeURIComponent(n)}` },
  { key: "jt", name: "J&T Express", url: (n) => `https://www.jtexpress.co.th/service/track?billcode=${encodeURIComponent(n)}` },
  { key: "other", name: "อื่น ๆ", url: () => "" },
];
export const carrierName = (k: string | null | undefined) => CARRIERS.find((c) => c.key === k)?.name ?? (k || "");
export const carrierLink = (k: string | null | undefined, no: string) => (CARRIERS.find((c) => c.key === k)?.url(no) ?? "");

const r2c = (n: number) => Math.round(n * 100) / 100;
/** ค่าส่งจากยอดสินค้า (หลังส่วนลด) — fee null = รอกำหนด → 0 */
export function shippingFor(s: Pick<MarketSettings, "shipping_fee" | "free_threshold">, productAmount: number) {
  if (s.shipping_fee == null || productAmount <= 0) return 0;
  if (s.free_threshold != null && productAmount >= s.free_threshold) return 0;
  return s.shipping_fee;
}
/** ตรวจโค้ด → ส่วนลด (บาท) หรือข้อความผิดพลาด */
export function promoDiscount(p: Promo | null | undefined, subtotal: number, at = Date.now()): { ok: true; discount: number } | { ok: false; error: string } {
  if (!p || !p.active) return { ok: false, error: "ไม่พบโค้ดส่วนลดนี้" };
  if (p.expires_at && Date.parse(p.expires_at) < at) return { ok: false, error: "โค้ดหมดอายุแล้ว" };
  if (p.usage_limit != null && p.used_count >= p.usage_limit) return { ok: false, error: "โค้ดถูกใช้ครบจำนวนแล้ว" };
  if (subtotal < p.min_spend) return { ok: false, error: `ยอดขั้นต่ำ ฿${baht(p.min_spend)}` };
  const d = p.kind === "percent" ? (subtotal * Math.min(100, p.value)) / 100 : p.value;
  return { ok: true, discount: r2c(Math.min(subtotal, Math.max(0, d))) };
}
export const POLICY_PAGES = {
  returns: { title: "นโยบายคืนสินค้า", key: "policy_returns" },
  shipping: { title: "นโยบายการจัดส่ง", key: "policy_shipping" },
  "privacy-shop": { title: "นโยบายความเป็นส่วนตัว (ร้านค้า)", key: "policy_privacy" },
} as const;
export type PolicySlug = keyof typeof POLICY_PAGES;
export const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || `shop-${Date.now().toString(36)}`;
