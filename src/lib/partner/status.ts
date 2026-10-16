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

// ── นัด QC สถานที่ (migration 0005_qc) ──
export type QcStatus = "booked" | "passed" | "failed";
export const QC_DOC_DEFS = [
  { key: "license", label: "ใบอนุญาตสถานประกอบการ", multi: false },
  { key: "photos", label: "รูปสถานที่", multi: true },
  { key: "prices", label: "ราคาบริการ", multi: false },
] as const;
export type QcDocKey = (typeof QC_DOC_DEFS)[number]["key"];
export type QcDocs = Partial<Record<QcDocKey, string[]>>;
export const QC_CHECKS = ["มาตรฐานการนวด (เทียบเท่า Bamrungsuk)", "ความสะอาด", "ห้อง / สถานที่", "ใบอนุญาต", "เอกสาร"];
export const QC_TIMES = ["10:00", "13:00", "15:30"] as const;
export const qcDocCount = (d: QcDocs | null | undefined) => QC_DOC_DEFS.filter((x) => (d?.[x.key]?.length ?? 0) > 0).length;

/** วัน-เวลานัด QC แบบไทย เช่น "20 ต.ค. · 10:00" */
export function qcSlotLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(Date.parse(iso) + 7 * 3600_000);
  const m = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."][d.getUTCMonth()];
  return `${d.getUTCDate()} ${m} · ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** รหัสพาร์ทเนอร์ที่แสดงให้ผู้สมัคร: MBP-YYMM### (ปี/เดือนที่สมัคร + เลขจาก id) */
export function partnerCode(id: string, createdAt: string): string {
  const d = new Date(Date.parse(createdAt) + 7 * 3600_000);
  const n = (parseInt(id.replace(/-/g, "").slice(0, 6), 16) || 0) % 1000;
  return `MBP-${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(n).padStart(3, "0")}`;
}

// ── ไทม์ไลน์สถานะการสมัคร (หน้าสมัครสำเร็จ + หน้ารออนุมัติ) ──
export type StepState = "done" | "next" | "todo" | "fail";
export interface TimelineStep { n: string; st: StepState; sub: string }
export interface TimelineInput {
  status: PartnerStatus; qc: PartnerQc; account_status?: string | null; clip_status?: string | null;
  qc_slot?: string | null; qc_status?: QcStatus | null;
  /** สถานะสลิปล่าสุด: paid | pending | rejected | null (ยังไม่ส่ง) */
  pay: "paid" | "pending" | "rejected" | null;
}
export function partnerTimeline(p: TimelineInput): TimelineStep[] {
  const live = p.account_status === "active";
  const approved = live || p.account_status === "approved" || p.status === "active";
  const qcPassed = p.qc === "passed" || p.qc_status === "passed";
  const qcFailed = p.qc === "failed" || p.qc_status === "failed";
  const raw: [string, boolean, string, boolean][] = [
    ["ส่งใบสมัคร", true, "", false],
    ["ชำระแผนโปรโมท", p.pay === "paid" || p.pay === "pending",
      p.pay === "pending" ? "รอตรวจสลิป" : p.pay === "rejected" ? "สลิปไม่ผ่าน กรุณาส่งใหม่" : p.pay ? "" : "ยังไม่ได้ส่งสลิป", p.pay === "rejected"],
    ["นัด QC สถานที่", qcPassed, qcFailed ? "ไม่ผ่าน QC · ทีมงานจะติดต่อกลับ" : p.qc_slot ? `นัดแล้ว ${qcSlotLabel(p.qc_slot)}` : "", qcFailed],
    ["ทำสัญญา + ป้ายแบรนด์", qcPassed && approved, "", false],
    ["ถ่ายคลิปโปรโมท", p.clip_status === "posted", p.clip_status === "shot" ? "ถ่ายแล้ว" : p.clip_status === "editing" ? "กำลังตัดต่อ" : "", false],
    ["เปิดแสดงบนแพลตฟอร์ม", live, "", false],
  ];
  let nextSet = false;
  return raw.map(([n, done, sub, fail]) => {
    if (fail) { nextSet = true; return { n, st: "fail" as const, sub }; }
    if (done) return { n, st: "done" as const, sub };
    if (!nextSet) { nextSet = true; return { n, st: "next" as const, sub }; }
    return { n, st: "todo" as const, sub };
  });
}

/** วันที่นัด QC ได้: วันทำการ (จ.–ส.) ถัดไป n วัน เริ่มพรุ่งนี้ (เวลาไทย) → [{date:"YYYY-MM-DD", day:"20", wd:"อ. ต.ค."}] */
export function qcDays(n = 10, now = Date.now()) {
  const WD = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  const MO = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const out: { date: string; day: string; wd: string; mo: string }[] = [];
  let t = now + 7 * 3600_000;
  while (out.length < n) {
    t += 86400_000;
    const d = new Date(t);
    if (d.getUTCDay() === 0) continue;
    out.push({ date: d.toISOString().slice(0, 10), day: String(d.getUTCDate()), wd: `${WD[d.getUTCDay()]} ${MO[d.getUTCMonth()]}`, mo: MO[d.getUTCMonth()] });
  }
  return out;
}
