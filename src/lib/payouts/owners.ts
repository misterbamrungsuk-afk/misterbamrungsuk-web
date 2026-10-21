import "server-only";
import { listMembers } from "@/lib/customer/admin";
import { listApplicants } from "@/lib/join/store";
import { listPartners } from "@/lib/partner/store";
import { listVendors } from "@/lib/market/store";
import { listReps } from "@/lib/member/store";
import { allBalances } from "@/lib/wallet";

// รายชื่อเจ้าของบัญชีกระเป๋าเงิน (ใช้ในหน้าแอดมินกระเป๋าเงิน: เลือกบัญชีที่จะปรับยอด + แสดงชื่อแทนรหัส)
export type AdjOwnerType = "customer" | "parttime" | "partner" | "vendor" | "sales";
export type OwnerRow = { type: AdjOwnerType; id: string; name: string };

/** ช่องที่ปรับยอดได้ต่อประเภท — ห้ามแตะ held/escrow/withdrawing (ผูกกับการจอง/คำขอถอน กระทบยอดจะพัง) */
export const ADJUST_BUCKETS: Record<AdjOwnerType, readonly string[]> = {
  customer: ["available"],
  parttime: ["available", "pending", "boost_credit", "bond"],
  partner: ["available"],
  vendor: ["available"],
  sales: ["available"],
};
export const isAdjOwner = (t: unknown): t is AdjOwnerType => typeof t === "string" && t in ADJUST_BUCKETS;

export async function ownerDirectory(): Promise<OwnerRow[]> {
  const [cs, ps, ptn, vs, rs] = await Promise.all([
    listMembers().catch(() => []), listApplicants().catch(() => []), listPartners().catch(() => []), listVendors().catch(() => []), listReps().catch(() => []),
  ]);
  return [
    ...cs.filter((c) => !c.deleted_at).map((c) => ({ type: "customer" as const, id: c.id, name: [c.email, c.name].filter(Boolean).join(" · ") })),
    ...ps.map((a) => ({ type: "parttime" as const, id: a.id, name: [a.mb_code, a.nickname].filter(Boolean).join(" · ") })),
    ...ptn.map((p) => ({ type: "partner" as const, id: p.id, name: `${p.business_name} · ${p.type}` })),
    ...vs.filter((v) => !v.sample).map((v) => ({ type: "vendor" as const, id: v.id, name: v.name })),
    ...rs.filter((r) => r.kind === "external").map((r) => ({ type: "sales" as const, id: r.id, name: `${r.name} · ${r.code}` })),
  ];
}

/** บัญชีนี้มีอยู่จริงไหม (ก่อนลงรายการปรับยอด — กันพิมพ์รหัสผิดแล้วเงินไปค้างบัญชีผี) */
export async function ownerExists(type: AdjOwnerType, id: string): Promise<boolean> {
  if (!id) return false;
  if ((await ownerDirectory()).some((o) => o.type === type && o.id === id)) return true;
  // มีบัญชีในกระเป๋าแล้ว (เช่น ลูกค้าที่เคยเติมเงิน) = มีตัวตน · โหมดเดโม: ลูกค้า demo:<อีเมล> ถือว่ามี
  if ((await allBalances().catch(() => [])).some((a) => a.owner_type === type && a.owner_id === id)) return true;
  return type === "customer" && !process.env.SUPABASE_URL && id.startsWith("demo:");
}
