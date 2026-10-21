import "server-only";
import { PLATFORM, WalletError, balances, history, post } from "@/lib/wallet";

// เงินประกันงาน (บอสกำหนด 21 ต.ค. 2569) — เฉพาะ Part-Time สายคำเชิญพิเศษ (สมัครฟรี) กันหนีงาน/เทงานกะทันหัน
// · ทุกนัดที่จบแล้วปล่อยรายได้ (matureOne) หักเคสละ ฿500 เข้า PT.bond (ไม่เกินส่วนแบ่งนัดนั้น)
// · เงินแต่ละก้อนครบ 90 วัน → Part-Time กดย้ายเข้ายอดถอนได้ (ถอนเสียค่าธรรมเนียม 3% ตามการถอนปกติ)
// · หนีงาน/เทงาน → แอดมินหักจากช่อง bond (ปรับยอดพร้อมเหตุผล ที่ /admin/wallet)
export const BOND = { perJobSatang: 50_000, lockDays: 90 } as const;

/** ใช้กับคนที่สมัครฟรี: สายคำเชิญพิเศษ หรือหมวดทอมหล่อ */
export const bondApplies = (x: { invite?: string | null; group?: string | null }) => !!x.invite || x.group === "tom";

/** ส่วนที่หักเข้าเงินประกันจากรายได้นัดนี้ (สตางค์) */
export const bondCut = (invite: boolean, amt: number) => (invite ? Math.max(0, Math.min(BOND.perJobSatang, amt)) : 0);

export type BondStatus = { balance: number; matured: number; locked: number; next: { at: string; amount: number } | null; jobs: number };

/** ยอดเงินประกัน: ก้อนเข้า (บวก) ที่ครบ 90 วัน − ที่ย้ายออกแล้ว (bond_release) · ไม่เกินยอดคงเหลือ (หักโดยแอดมินแล้วก็ลดตาม) */
export async function bondStatus(parttime_id: string, now = Date.now()): Promise<BondStatus> {
  const [bal, h] = await Promise.all([balances("parttime", parttime_id).catch(() => ({} as Record<string, number>)), history("parttime", parttime_id, 1000).catch(() => [])]);
  const balance = Math.max(0, bal.bond ?? 0);
  const rows = h.filter((e) => e.bucket === "bond");
  const ins = rows.filter((e) => e.amount > 0 && e.kind === "mature");
  const released = rows.filter((e) => e.kind === "bond_release").reduce((s, e) => s - e.amount, 0);
  const cutoff = now - BOND.lockDays * 86400_000;
  const ripe = ins.filter((e) => Date.parse(e.created_at) <= cutoff).reduce((s, e) => s + e.amount, 0);
  const matured = Math.max(0, Math.min(balance, ripe - released));
  const pend = ins.filter((e) => Date.parse(e.created_at) > cutoff).sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  const locked = balance - matured;
  // ก้อนถัดไปแสดงเฉพาะเมื่อยังมีเงินค้าง (ถูกย้ายออก/หักไปหมดแล้ว = ไม่มีก้อนถัดไป)
  return { balance, matured, locked, next: pend && locked > 0 ? { at: new Date(Date.parse(pend.created_at) + BOND.lockDays * 86400_000).toISOString(), amount: Math.min(pend.amount, locked) } : null, jobs: ins.length };
}

/** Part-Time ย้ายเงินประกันที่ครบ 90 วันเข้ายอดถอนได้ */
export async function releaseBond(parttime_id: string, actor: string, now = Date.now()): Promise<number> {
  const s = await bondStatus(parttime_id, now);
  if (s.matured <= 0) throw new WalletError(s.next ? `ยังไม่มีเงินประกันที่ครบ ${BOND.lockDays} วัน` : "ไม่มีเงินประกันให้ย้าย");
  await post("bond_release", { type: "bond", id: parttime_id }, `bondrel:${parttime_id}:${s.balance}:${s.matured}:${Math.floor(Date.now() / 60000)}`, `ย้ายเงินประกันงานที่ครบ ${BOND.lockDays} วันเข้ายอดถอนได้`, actor, [
    { owner_type: "parttime", owner_id: parttime_id, bucket: "bond", amount: -s.matured },
    { owner_type: "parttime", owner_id: parttime_id, bucket: "available", amount: s.matured },
  ]);
  return s.matured;
}
export { PLATFORM };
