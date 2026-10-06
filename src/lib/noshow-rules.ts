import { site } from "./site";
import { STRIKE_DEDUCTION } from "./strikes";

// กติกาผิดนัด (no-show) — ใช้ร่วมกันทั้งหน้า Part-Time / ลูกค้า / แอดมิน / ข้อกำหนด
export const NOSHOW_WAIT_MIN = 15;
export const NOSHOW_DECISION_HOURS = 24;
export const PAYOUT_PERCENT = 100 - site.commissionPercent; // 85
export const NOSHOW_POINTS = STRIKE_DEDUCTION;

export type ClaimStatus = "pending" | "customer_no_show" | "provider_no_show";
export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  pending: "รอแอดมินตรวจ",
  customer_no_show: "ตัดสิน: ลูกค้าไม่มา",
  provider_no_show: "ตัดสิน: Part-Time ไม่มา",
};

export interface Evidence {
  at: string;
  gps: { lat: number; lng: number; accuracy: number } | null;
  gpsError?: string;
  photo?: string | null; // path ใน storage
  attempts: number;
  attemptsSource: "chat_log" | "manual";
  note?: string;
}

export interface NoShowClaim {
  id: string;
  booking_id: string;
  amount: number;
  customer_name: string;
  provider_name: string;
  provider_id: string;
  status: ClaimStatus;
  provider_evidence: Evidence | null;
  customer_evidence: Evidence | null;
  /** เงินพักไว้จนแอดมินตัดสิน */
  on_hold: boolean;
  payout_amount: number | null;
  refund_amount: number | null;
  strike_added: boolean;
  points_deducted: number;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

/** ข้อความกติกา (ไทย) — แสดงในหน้าใบเตือน, ข้อกำหนด, ตั้งค่าแอดมิน */
export const NOSHOW_RULES_TH: [string, string][] = [
  ["ลูกค้าไม่มาตามนัด", `Part-Time รอครบ ${NOSHOW_WAIT_MIN} นาทีและติดต่อลูกค้าไม่ได้ → ถ้าแอดมินยืนยัน ลูกค้าถูกเก็บเต็มจำนวน และ Part-Time ได้รับ ${PAYOUT_PERCENT}% (หักค่าธรรมเนียม ${site.commissionPercent}%)`],
  ["Part-Time ไม่มาตามนัด", `ถ้าแอดมินยืนยัน ลูกค้าได้เงินคืน 100% และ Part-Time ได้ใบเตือน 1 ครั้ง + หัก ${NOSHOW_POINTS} คะแนน`],
  ["หลักฐานที่ต้องมี", "Part-Time: เช็กอิน GPS ที่จุดนัด + รูปถ่ายสถานที่ (มีเวลา) + จำนวนครั้งที่โทร/แชทในแอป · ลูกค้า: ตำแหน่งของคุณ + จำนวนครั้งที่ติดต่อ + รูป (ถ้ามี) — ระบบดูเส้นทาง GPS ของ Part-Time ประกอบด้วย"],
  ["การตัดสิน", `แอดมินตรวจหลักฐานทั้งสองฝ่ายภายใน ${NOSHOW_DECISION_HOURS} ชม. ระหว่างนี้เงินพักไว้กับเรา ยังไม่จ่ายและยังไม่คืนใครจนกว่าจะตัดสิน`],
];
