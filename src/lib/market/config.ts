// ─────────────────────────────────────────────────────────────
//  Marketplace (หน้าแรก) — ค่าคงที่ + ชนิดข้อมูล ใช้ได้ทั้งฝั่งเว็บและเซิร์ฟเวอร์
//  GP % ต่อ vendor ตั้งในหลังบ้าน /admin/market (null = [รอกำหนด])
// ─────────────────────────────────────────────────────────────

export const ORDER_STATUSES = ["pending", "paid", "shipped", "done", "rejected"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "รอตรวจสลิป",
  paid: "ยืนยันชำระแล้ว",
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

export interface Vendor { id: string; name: string; contact: string; gp_pct: number | null; created_at: string }
export interface Product {
  id: string; vendor_id: string; name: string; description: string; warning: string;
  price: number; images: string[]; fda_no: string | null; stock: number;
  age_restricted: boolean; published: boolean; created_at: string;
}
export interface OrderItem { product_id: string; vendor_id: string; name: string; price: number; qty: number }
export interface Order {
  id: string; order_no: string; buyer_name: string; phone: string; address: string;
  items: OrderItem[]; total: number; gp_pct: number | null; gp_amount: number | null; vendor_amount: number | null;
  slip_path: string | null; status: OrderStatus; tracking_no: string | null; admin_note: string | null;
  age_confirmed_at: string; ip: string; paid_at: string | null; decided_by: string | null; created_at: string;
}
export type CartLine = { id: string; qty: number };

/** รูปสินค้า: path ใน storage → URL ผ่าน API (หรือ URL เต็ม/ไฟล์ใน public) */
export const imageUrl = (p: string | undefined) => (!p ? "" : /^(https?:)?\//.test(p) ? p : `/api/market/image?p=${encodeURIComponent(p)}`);

export const baht = (n: number) => n.toLocaleString("th-TH");
export const fmtPct = (n: number | null) => (n == null ? GP_PENDING : `${n}%`);
