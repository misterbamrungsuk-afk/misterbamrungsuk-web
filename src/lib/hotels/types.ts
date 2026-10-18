// จองห้องพักโรงแรมพาร์ทเนอร์ในแอป — ชนิดข้อมูล + กติกา + วันที่เวลาไทย (ใช้ได้ทั้ง client และ server)
// เงิน: จ่ายจากกระเป๋า → พักไว้ที่บริษัท (platform.hotel_escrow) → โรงแรมยืนยัน → หลังวันเช็กเอาต์แบ่งเข้ากระเป๋าโรงแรม (หัก % แพลตฟอร์ม)

export const MAX_NIGHTS = 14;
/** จองล่วงหน้าได้ไม่เกินกี่วัน */
export const MAX_AHEAD_DAYS = 180;
/** โรงแรมต้องตอบภายในกี่ชั่วโมง (หรือก่อนเวลาเช็กอิน แล้วแต่อะไรถึงก่อน) ไม่ตอบ = คืนเงินเต็ม */
export const CONFIRM_HOURS = 12;
/** ยกเลิกฟรีได้ถึงกี่ชั่วโมงก่อนเวลาเช็กอิน (หลังจากนั้นยกเลิกได้แต่ไม่คืนเงิน) */
export const FREE_CANCEL_HOURS = 24;
export const CHECKIN_TIME = "14:00";
export const CHECKOUT_TIME = "12:00";
export const MAX_ROOMS_PER_BOOKING = 10;

export type RoomType = {
  id: string; partner_id: string; name: string; price_satang: number; capacity: number; rooms: number;
  photos: string[]; description: string | null; active: boolean; sort: number; created_at: string; updated_at: string;
};
/** สถานะ: paying = กำลังตัดเงิน (ภายใน) · void = ตัดเงินไม่สำเร็จ (ไม่มีเงินเคลื่อน) */
export const STAY_STATUSES = ["paying", "pending", "confirmed", "declined", "expired", "cancelled", "completed", "refunded", "void"] as const;
export type StayStatus = (typeof STAY_STATUSES)[number];
export const STAY_LABEL: Record<StayStatus, string> = {
  paying: "กำลังชำระ", pending: "รอโรงแรมยืนยัน", confirmed: "ยืนยันแล้ว", declined: "โรงแรมปฏิเสธ · คืนเงินแล้ว", expired: "โรงแรมไม่ได้ตอบ · คืนเงินแล้ว",
  cancelled: "ยกเลิกแล้ว", completed: "เข้าพักเรียบร้อย", refunded: "ทีมงานคืนเงินแล้ว", void: "ชำระไม่สำเร็จ",
};
/** สถานะที่กันห้องไว้ (นับในห้องว่าง) */
export const HOLDING: StayStatus[] = ["paying", "pending", "confirmed"];

export type StayBooking = {
  id: string; code: string; partner_id: string; partner_name: string; room_type_id: string; room_name: string;
  customer_id: string; customer_email: string | null; guest_name: string; guests: number; rooms: number;
  check_in: string; check_out: string; nights: number; price_satang: number; total_satang: number; platform_pct: number;
  status: StayStatus; note: string | null; expires_at: string; decline_reason: string | null;
  refund_satang: number | null; partner_net_satang: number | null; platform_fee_satang: number | null;
  confirmed_at: string | null; declined_at: string | null; cancelled_at: string | null; completed_at: string | null; refunded_at: string | null;
  created_at: string; updated_at: string;
};

// ── วันที่ (เวลาไทย) ──
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isDate = (s: unknown): s is string => typeof s === "string" && DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
export const bkkToday = (now = Date.now()) => new Date(now + 7 * 3600_000).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);
export const nightsBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400_000);
/** คืนที่พัก (วันที่ของแต่ละคืน) */
export const nightsOf = (a: string, b: string) => Array.from({ length: Math.max(0, nightsBetween(a, b)) }, (_, i) => addDays(a, i));
export const checkinAt = (d: string) => Date.parse(`${d}T${CHECKIN_TIME}:00+07:00`);
export const checkoutAt = (d: string) => Date.parse(`${d}T${CHECKOUT_TIME}:00+07:00`);

/** ยกเลิกฟรีได้ไหม: รอโรงแรมยืนยัน = ฟรีเสมอ · ยืนยันแล้ว = ฟรีถึง 24 ชม. ก่อนเวลาเช็กอิน */
export const freeCancelUntil = (b: Pick<StayBooking, "check_in">) => checkinAt(b.check_in) - FREE_CANCEL_HOURS * 3600_000;
export function cancelRule(b: Pick<StayBooking, "status" | "check_in">, now = Date.now()): { can: boolean; refund: boolean } {
  if (b.status === "pending") return { can: true, refund: true };
  if (b.status !== "confirmed" || now >= checkinAt(b.check_in)) return { can: false, refund: false };
  return { can: true, refund: now < freeCancelUntil(b) };
}

export const thDate = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", year: "numeric" }) =>
  new Date(`${d}T12:00:00+07:00`).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", ...opts });
export const thTime = (iso: string | number) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const bahtTxt = (satang: number) => "฿" + (satang / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });

/** ส่วนแบ่ง: % แพลตฟอร์มปัดเป็นสตางค์ · โรงแรมได้ส่วนที่เหลือ (รวมกัน = ยอดเต็ม) */
export function staySplit(total: number, pct: number) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  const fee = Math.round((total * p) / 100);
  return { fee, net: total - fee };
}

/** คืนเงินหลังเข้าพักเสร็จ (ทีมงาน · คืนเต็มหรือบางส่วน · คืนได้หลายครั้งจนครบยอด)
 *  ดึงจากโรงแรม (partner.available) และรายได้แพลตฟอร์มตามสัดส่วนเดิมของการแบ่ง — คิดแบบสะสม ปัดเศษแล้วรวมทุกครั้งเท่าส่วนแบ่งเดิมพอดี */
export function afterStayRefundSplit(b: Pick<StayBooking, "total_satang" | "partner_net_satang" | "platform_fee_satang" | "platform_pct" | "refund_satang">, amount: number) {
  const total = b.total_satang;
  const net = b.partner_net_satang ?? staySplit(total, b.platform_pct).net;
  const prior = b.refund_satang ?? 0;
  const left = Math.max(0, total - prior);
  const amt = Math.round(amount);
  const cum = (x: number) => (total > 0 ? Math.round((x * net) / total) : 0);
  const fromPartner = amt > 0 && amt <= left ? cum(prior + amt) - cum(prior) : 0;
  return { prior, left, amount: amt, fromPartner, fromPlatform: amt > 0 && amt <= left ? amt - fromPartner : 0, full: amt === left && amt > 0 };
}
