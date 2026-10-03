// กติกาใบเตือน (strike) ผู้ให้บริการ — ทำงานอัตโนมัติ
// - รีวิว 1 ดาว หรือถูกรายงานพฤติกรรมไม่เหมาะสม → +1 strike, หักคะแนน, แจ้งแอดมิน
// - ครบ 3 strike → ระงับบัญชี (แบน)
// เดโม: คำนวณฝั่ง client จากรายการเหตุการณ์ (ยังไม่มี API) — ย้ายไปเซิร์ฟเวอร์เมื่อมีฐานข้อมูลจริง

export const STRIKE_LIMIT = 3;
/** คะแนนที่หักต่อ 1 strike (จากคะแนนความประพฤติเต็ม 100) */
export const STRIKE_DEDUCTION = 20;
export const BASE_SCORE = 100;
/** ใบเตือนหมดอายุหลัง 90 วัน */
export const STRIKE_EXPIRE_DAYS = 90;

export type StrikeEventType = "review" | "report" | "late";

export interface StrikeEvent {
  id: string;
  type: StrikeEventType;
  /** ดาวรีวิว (เฉพาะ type = review) */
  stars?: number;
  /** รายงานพฤติกรรมไม่เหมาะสม (เฉพาะ type = report) */
  inappropriate?: boolean;
  /** strike ที่แอดมินให้เอง (เช่น มาสาย) */
  manual?: boolean;
  ref?: string;
  note: string;
  at: string; // ISO date
}

export interface Strike {
  id: string;
  reason: string;
  ref?: string;
  at: string;
  expiresAt: string;
}

export interface AdminNotice {
  id: string;
  text: string;
  at: string;
  level: "warn" | "ban";
}

export type StrikeStatusKind = "ok" | "warned" | "banned";

/** เหตุการณ์นี้ทำให้เกิด strike ไหม */
export function triggersStrike(e: StrikeEvent): boolean {
  if (e.type === "review") return e.stars === 1;
  if (e.type === "report") return !!e.inappropriate;
  return !!e.manual;
}

const REASON: Record<StrikeEventType, string> = { review: "รีวิว 1 ดาว", report: "ถูกรายงานพฤติกรรมไม่เหมาะสม", late: "มาสาย" };

const addDays = (iso: string, d: number) => new Date(new Date(iso).getTime() + d * 86400_000).toISOString();

export function strikeStatus(count: number): { kind: StrikeStatusKind; label: string } {
  if (count >= STRIKE_LIMIT) return { kind: "banned", label: "ระงับบัญชี" };
  if (count > 0) return { kind: "warned", label: `ถูกเตือน ${count}/${STRIKE_LIMIT}` };
  return { kind: "ok", label: "ปกติ" };
}

/** ประมวลเหตุการณ์ทั้งหมด → strike ที่ยังไม่หมดอายุ, คะแนน, สถานะ, การแจ้งเตือนแอดมิน */
export function evaluateStrikes(providerName: string, events: StrikeEvent[], now = new Date()) {
  const strikes: Strike[] = [];
  const notices: AdminNotice[] = [];
  for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at))) {
    if (!triggersStrike(e)) continue;
    const expiresAt = addDays(e.at, STRIKE_EXPIRE_DAYS);
    if (new Date(expiresAt) < now) continue;
    strikes.push({ id: e.id, reason: REASON[e.type], ref: e.ref, at: e.at, expiresAt });
    const n = strikes.length;
    notices.push({
      id: `n-${e.id}`, at: e.at, level: n >= STRIKE_LIMIT ? "ban" : "warn",
      text: n >= STRIKE_LIMIT
        ? `ระงับบัญชีอัตโนมัติ ${providerName} (ครบ ${STRIKE_LIMIT} strike) — ${REASON[e.type]}`
        : `${providerName} ได้รับ strike ${n}/${STRIKE_LIMIT} — ${REASON[e.type]}${e.ref ? ` (${e.ref})` : ""}`,
    });
  }
  const count = Math.min(strikes.length, STRIKE_LIMIT);
  const score = Math.max(0, BASE_SCORE - count * STRIKE_DEDUCTION);
  return { strikes, count, score, banned: count >= STRIKE_LIMIT, status: strikeStatus(count), notices };
}

/** ข้อมูลเดโมของผู้ให้บริการที่ล็อกอินอยู่ */
export const DEMO_STRIKE_EVENTS: StrikeEvent[] = [
  { id: "e1", type: "review", stars: 5, note: "บริการดีมาก", ref: "O-1150", at: "2026-09-10T12:00:00+07:00" },
  { id: "e2", type: "late", manual: true, note: "ถึงสถานที่ช้ากว่านัด 35 นาที", ref: "O-1182", at: "2026-09-22T12:00:00+07:00" },
  { id: "e3", type: "review", stars: 1, note: "ไม่ตรงปก สื่อสารไม่ดี", ref: "O-1201", at: "2026-09-28T12:00:00+07:00" },
];
