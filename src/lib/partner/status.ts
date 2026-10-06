// สถานะพาร์ทเนอร์ (ใช้ได้ทั้ง client และ server)
export const PARTNER_STATUSES = ["new", "contacted", "qc", "active", "expired", "rejected"] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];
export const STATUS_LABEL: Record<PartnerStatus, string> = {
  new: "ใหม่", contacted: "ติดต่อแล้ว", qc: "รอ QC / สัญญา", active: "กำลังโปรโมท", expired: "หมดอายุ", rejected: "ปฏิเสธ",
};
export const QC_STATES = ["pending", "passed", "failed"] as const;
export type PartnerQc = (typeof QC_STATES)[number];
export const QC_LABEL: Record<PartnerQc, string> = { pending: "รอตรวจ", passed: "ผ่าน", failed: "ไม่ผ่าน" };

/** จำนวนวันที่เหลือจนถึง ends_at (null ถ้ายังไม่กำหนด) */
export function daysLeft(ends: string | null, now = Date.now()): number | null {
  if (!ends) return null;
  return Math.ceil((Date.parse(`${ends}T23:59:59+07:00`) - now) / 86_400_000);
}
