// ชนิดข้อมูล + ป้ายภาษาไทยของพอร์ทัลพาร์ทเนอร์ (ใช้ได้ทั้ง client และ server)
import type { PartnerPackageKey } from "./config";

export const ACCOUNT_STATUSES = ["pending", "approved", "active", "expired"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
export const ACCOUNT_LABEL: Record<AccountStatus, string> = { pending: "รออนุมัติ", approved: "อนุมัติแล้ว", active: "เปิดแสดงอยู่", expired: "หมดอายุ" };

export const CLIP_STATUSES = ["shot", "editing", "posted"] as const;
export type ClipStatus = (typeof CLIP_STATUSES)[number];
export const CLIP_LABEL: Record<ClipStatus, string> = { shot: "ถ่ายแล้ว", editing: "ตัดต่อ", posted: "โพสต์แล้ว" };

export const PURCHASE_STATUSES = ["pending", "paid", "rejected"] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];
export const PURCHASE_LABEL: Record<PurchaseStatus, string> = { pending: "รอตรวจสลิป", paid: "ชำระแล้ว", rejected: "ไม่ผ่าน" };

export const BOOKING_STATUSES = ["pending", "confirmed", "full", "done", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export const BOOKING_LABEL: Record<BookingStatus, string> = { pending: "รอยืนยัน", confirmed: "ยืนยันแล้ว", full: "ห้องเต็ม", done: "เสร็จสิ้น", cancelled: "ยกเลิก" };

export const DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
export const AMENITIES = ["ห้องอาบน้ำส่วนตัว", "ที่จอดรถ", "ห้องพักรอ", "อ่างจากุซซี่", "ซาวน่า", "Wi-Fi", "เครื่องดื่มต้อนรับ", "รองรับภาษาอังกฤษ"];

/** บริการของสปา: ราคาฐานของสปา → ราคาขายบนแพลตฟอร์ม (platform_price กำหนดโดยทีมงาน; null = [รอกำหนด]) */
export type ServiceItem = { name: string; minutes: number; base_price: number; platform_price: number | null };

export type DayHours = { day: number; open: boolean; from: string; to: string };
export const DEFAULT_HOURS: DayHours[] = DAYS.map((_, day) => ({ day, open: true, from: "10:00", to: "22:00" }));

export interface Listing {
  partner_id: string;
  cover: string | null;
  gallery: string[];
  type: string | null;
  description: string | null;
  hours: DayHours[];
  rooms: number;
  amenities: string[];
  /** รายการบริการ (คอลัมน์จาก supabase/partner/0003_services.sql) */
  services?: ServiceItem[];
  area: string | null;
  published: boolean;
  updated_at: string;
}

export interface Purchase {
  id: string;
  partner_id: string;
  invoice_no: string;
  package: PartnerPackageKey;
  amount: number;
  slip_url: string | null;
  status: PurchaseStatus;
  starts_at: string | null;
  ends_at: string | null;
  note: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface PartnerBooking {
  id: string;
  partner_id: string;
  booking_ref: string;
  customer_name: string;
  parttime_name: string;
  start_time: string;
  hours: number;
  room: string | null;
  addon: string | null;
  status: BookingStatus;
  amount: number;
  platform_pct: number | null;
  created_at: string;
}

/** URL รูปใน bucket partners (เสิร์ฟผ่าน API) */
export const fileUrl = (path: string | null | undefined) => (path ? `/api/partner/file?path=${encodeURIComponent(path)}` : "");

/** ส่วนแบ่งรายได้ — pct null = [รอกำหนด] */
export function split(amount: number, pct: number | null) {
  if (pct == null) return null;
  const fee = Math.round((amount * pct) / 100);
  return { fee, net: amount - fee };
}
