// ส่วนที่ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และหน้าเว็บ (ไม่มีการเข้าถึง storage)
export type Tier = { min: number; max: number | null; pct: number };

/** ส่วนแบ่งตามจำนวนนัดในเดือน */
export function pctFor(tiers: Tier[], cases: number): number {
  let pct = tiers[0]?.pct ?? 0;
  for (const t of tiers) if (cases >= t.min) pct = t.pct;
  return pct;
}
export const tierLabel = (t: Tier) => (t.max === null ? `${t.min} นัดขึ้นไป` : t.min <= 1 ? `ไม่เกิน ${t.max} นัด` : `${t.min}–${t.max} นัด`);
