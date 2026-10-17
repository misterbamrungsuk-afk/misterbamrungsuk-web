// ประเภทสถานที่ของพาร์ทเนอร์ (ใช้ได้ทั้ง client และ server) — จุดเดียวที่ตัดสินว่า "สปา" หรือ "โรงแรม"
// สปา = ประเภทที่มีคำว่า "สปา" หรือ "นวด" (เดย์สปา · สปาเพื่อสุขภาพ · ร้านนวดเพื่อสุขภาพ · สปาในโรงแรม · เวลเนส)
// โรงแรม = มี "โรงแรม" / "รีสอร์ท" / "โฮสเทล" ที่ไม่ใช่สปา
import { PARTNER_APPLY_TYPES, PARTNER_TYPES } from "./config";

export type VenueKind = "สปา" | "โรงแรม";

export function venueKind(type: string | null | undefined): VenueKind | null {
  const t = String(type ?? "");
  if (/สปา|นวด|เวลเนส/i.test(t) || /spa|massage|wellness/i.test(t)) return "สปา";
  if (/โรงแรม|รีสอร์ท|รีสอร์ต|โฮสเทล/.test(t) || /hotel|resort|hostel/i.test(t)) return "โรงแรม";
  return null;
}
export const isSpaType = (t: string | null | undefined) => venueKind(t) === "สปา";
export const isHotelType = (t: string | null | undefined) => venueKind(t) === "โรงแรม";

/** ประเภทที่เลือกได้ในหน้าร้าน/แอดมิน = ชุดเดิม + ชุดในฟอร์มสมัคร (ไม่ซ้ำ) */
export const LISTING_TYPES: readonly string[] = Array.from(new Set<string>([...PARTNER_APPLY_TYPES, ...PARTNER_TYPES]));
export const isListingType = (t: unknown): t is string => typeof t === "string" && LISTING_TYPES.includes(t);
/** ประเภทเริ่มต้นของหน้าร้าน: ใช้ประเภทตอนสมัครถ้าอยู่ในรายการ ไม่งั้นเดาจากคำ (สปา/โรงแรม) ไม่ได้ = อื่นๆ */
export function listingTypeFor(type: string | null | undefined): string {
  if (isListingType(type)) return type;
  return venueKind(type) ?? "อื่นๆ";
}

type Gate = { qc?: string | null; qc_status?: string | null; account_status?: string | null; status?: string | null };
/** ผ่าน QC สถานที่แล้ว (คอลัมน์ qc เดิม หรือ qc_status จากการนัด QC) */
export const qcPassed = (p: Gate) => p.qc === "passed" || p.qc_status === "passed";
/** แสดงต่อสาธารณะ/จองได้: บัญชีเปิดแสดงหรือกำลังโปรโมท + ผ่าน QC แล้วเท่านั้น (ชำระแผนแล้วยังไม่ผ่าน QC = ยังไม่เปิด) */
export const isPublicPartner = (p: Gate) => (p.account_status === "active" || p.status === "active") && qcPassed(p);
