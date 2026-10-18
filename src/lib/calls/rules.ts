// กติกาโทรผ่านแอป (ปรับที่นี่ที่เดียว · ใช้ทั้งเซิร์ฟเวอร์และหน้าจอ) — docs/plan/in-app-calls.md
export const CALL_RULES = {
  /** สถานะนัดที่โทรได้ */
  statuses: ["accepted", "checked_in"] as readonly string[],
  /** เริ่มโทรได้ก่อนเวลานัด */
  beforeMs: 2 * 3600_000,
  /** สายละไม่เกิน (นับจากรับสาย) */
  maxMs: 10 * 60_000,
  /** ไม่รับภายใน = สายที่ไม่ได้รับ */
  ringMs: 45_000,
  /** รับสายแล้วแต่ไม่มีข้อมูลตอบกลับ (answer) ภายใน = ต่อไม่สำเร็จ */
  connectMs: 60_000,
  /** เปิดสายได้กี่ครั้งต่อการจองต่อชั่วโมง */
  startsPerHour: 6,
  /** ขนาด SDP สูงสุด (ตัวอักษร) */
  maxSdp: 20_000,
} as const;

export type CallStatus = "ringing" | "active" | "ended" | "missed" | "declined";
export type CallSide = "customer" | "parttime";
/** สิ่งที่หน้าจอได้จาก GET /api/calls/[id] */
export type CallView = {
  id: string; booking_id: string; status: CallStatus; end_reason: string | null;
  me: "caller" | "callee"; peer_name: string;
  offer: string | null; answer: string | null;
  created_at: string; answered_at: string | null; ended_at: string | null; duration_s: number | null;
  ring_ends_at: string; max_ends_at: string | null;
};
