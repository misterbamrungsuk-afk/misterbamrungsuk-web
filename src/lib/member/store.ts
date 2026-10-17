import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SlipCheck } from "@/lib/slip2go";
import type { TierId } from "./tiers";

// ข้อมูลเปิดเมม / Sale Man / คำขอรับค่าคอม / แต้ม — Supabase (0008_members_sales.sql) หรือหน่วยความจำ (โหมดสาธิต)
export type MemberPurchase = {
  id: string; customer_id: string; customer_email: string | null; tier: TierId;
  pay_satang: number; credit_satang: number; bonus_satang: number;
  status: "pending" | "credited" | "rejected"; slip_path: string | null; slip_check: SlipCheck | null; trans_ref: string | null;
  ref_code: string | null; referrer_type: "parttime" | "sales" | null; referrer_id: string | null;
  commission_satang: number; commission_mode: "cash" | "boost" | null; commission_paid_at: string | null;
  reason: string | null; created_at: string; credited_at: string | null;
};
export type SalesRep = { id: string; code: string; kind: "parttime" | "external"; parttime_id: string | null; name: string; phone: string | null; bank: { bank: string; account: string; name: string } | null; active: boolean; created_by: string | null; created_at: string };
export type SalesPayout = { id: string; rep_id: string; amount_satang: number; bank: SalesRep["bank"]; status: "requested" | "approved" | "paid" | "failed"; approved_by: string | null; approved_at: string | null; note: string | null; created_at: string; paid_at: string | null };
export type PointRow = { id: number; customer_id: string; delta: number; reason: string; ref: string | null; created_at: string };

export const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
let sb: SupabaseClient | null = null;
export const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
type Demo = { purchases: MemberPurchase[]; reps: SalesRep[]; payouts: SalesPayout[]; points: PointRow[] };
const g = globalThis as unknown as { __mbMemberDemo?: Demo };
export const demo: Demo = (g.__mbMemberDemo ??= { purchases: [], reps: [], payouts: [], points: [] });
export const now = () => new Date().toISOString();

// ── คำสั่งเปิดเมม ──
export async function insertPurchase(row: Omit<MemberPurchase, "id" | "created_at" | "credited_at" | "commission_paid_at">): Promise<MemberPurchase> {
  const full: MemberPurchase = { ...row, id: crypto.randomUUID(), created_at: now(), credited_at: null, commission_paid_at: null };
  if (isDemo) { demo.purchases.unshift(full); return full; }
  const { data, error } = await db().from("member_purchases").insert(full).select().single();
  if (error?.code === "23505") throw new Error("dup_slip");
  if (error) throw error;
  return data as MemberPurchase;
}
export async function getPurchase(id: string): Promise<MemberPurchase | null> {
  if (isDemo) return demo.purchases.find((x) => x.id === id) ?? null;
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await db().from("member_purchases").select().eq("id", id).maybeSingle();
  return (data as MemberPurchase) ?? null;
}
export async function listPurchases(opts: { status?: MemberPurchase["status"]; customer_id?: string; referrer_id?: string } = {}): Promise<MemberPurchase[]> {
  if (isDemo) return demo.purchases.filter((p) => (!opts.status || p.status === opts.status) && (!opts.customer_id || p.customer_id === opts.customer_id) && (!opts.referrer_id || p.referrer_id === opts.referrer_id));
  let q = db().from("member_purchases").select().order("created_at", { ascending: false }).limit(500);
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.customer_id) q = q.eq("customer_id", opts.customer_id);
  if (opts.referrer_id) q = q.eq("referrer_id", opts.referrer_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MemberPurchase[];
}
export async function patchPurchase(id: string, from: MemberPurchase["status"][], patch: Partial<MemberPurchase>): Promise<MemberPurchase | null> {
  if (isDemo) { const p = demo.purchases.find((x) => x.id === id); if (!p || !from.includes(p.status)) return null; Object.assign(p, patch); return p; }
  const { data, error } = await db().from("member_purchases").update(patch).eq("id", id).in("status", from).select().maybeSingle();
  if (error) throw error;
  return (data as MemberPurchase) ?? null;
}
export async function transRefTaken(ref: string): Promise<boolean> {
  if (isDemo) return demo.purchases.some((p) => p.trans_ref === ref);
  const { count } = await db().from("member_purchases").select("id", { count: "exact", head: true }).eq("trans_ref", ref);
  return (count ?? 0) > 0;
}

// ── Sale Man ──
export async function listReps(): Promise<SalesRep[]> {
  if (isDemo) return [...demo.reps];
  const { data, error } = await db().from("sales_reps").select().order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SalesRep[];
}
export async function findRep(by: { code?: string; id?: string; parttime_id?: string }): Promise<SalesRep | null> {
  if (isDemo) return demo.reps.find((r) => (by.code && r.code === by.code) || (by.id && r.id === by.id) || (by.parttime_id && r.parttime_id === by.parttime_id)) ?? null;
  let q = db().from("sales_reps").select();
  if (by.code) q = q.eq("code", by.code); else if (by.id) q = q.eq("id", by.id); else if (by.parttime_id) q = q.eq("parttime_id", by.parttime_id); else return null;
  const { data } = await q.maybeSingle();
  return (data as SalesRep) ?? null;
}
export async function insertRep(row: Omit<SalesRep, "id" | "created_at">): Promise<SalesRep> {
  const full: SalesRep = { ...row, id: crypto.randomUUID(), created_at: now() };
  if (isDemo) { demo.reps.unshift(full); return full; }
  const { data, error } = await db().from("sales_reps").insert(full).select().single();
  if (error) throw error;
  return data as SalesRep;
}
export async function patchRep(id: string, patch: Partial<SalesRep>): Promise<SalesRep | null> {
  if (isDemo) { const r = demo.reps.find((x) => x.id === id); if (!r) return null; Object.assign(r, patch); return r; }
  const { data, error } = await db().from("sales_reps").update(patch).eq("id", id).select().maybeSingle();
  if (error) throw error;
  return (data as SalesRep) ?? null;
}

// ── คำขอรับค่าคอม (Sale Man ภายนอก) ──
export async function insertPayout(row: Omit<SalesPayout, "id" | "created_at" | "paid_at" | "approved_by" | "approved_at">): Promise<SalesPayout> {
  const full: SalesPayout = { ...row, id: crypto.randomUUID(), created_at: now(), paid_at: null, approved_by: null, approved_at: null };
  if (isDemo) { if (demo.payouts.some((p) => p.rep_id === row.rep_id && (p.status === "requested" || p.status === "approved"))) throw new Error("open_payout"); demo.payouts.unshift(full); return full; }
  const { data, error } = await db().from("sales_payouts").insert(full).select().single();
  if (error?.code === "23505") throw new Error("open_payout");
  if (error) throw error;
  return data as SalesPayout;
}
export async function listPayouts(opts: { rep_id?: string; status?: SalesPayout["status"] } = {}): Promise<SalesPayout[]> {
  if (isDemo) return demo.payouts.filter((p) => (!opts.rep_id || p.rep_id === opts.rep_id) && (!opts.status || p.status === opts.status));
  let q = db().from("sales_payouts").select().order("created_at", { ascending: false }).limit(300);
  if (opts.rep_id) q = q.eq("rep_id", opts.rep_id);
  if (opts.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SalesPayout[];
}
export async function dropPayout(id: string) {
  if (isDemo) { const i = demo.payouts.findIndex((p) => p.id === id); if (i >= 0) demo.payouts.splice(i, 1); return; }
  await db().from("sales_payouts").delete().eq("id", id).eq("status", "requested");
}
export async function patchPayout(id: string, from: SalesPayout["status"][], patch: Partial<SalesPayout>): Promise<SalesPayout | null> {
  if (isDemo) { const p = demo.payouts.find((x) => x.id === id); if (!p || !from.includes(p.status)) return null; Object.assign(p, patch); return p; }
  const { data, error } = await db().from("sales_payouts").update(patch).eq("id", id).in("status", from).select().maybeSingle();
  if (error) throw error;
  return (data as SalesPayout) ?? null;
}

// ── แต้ม ──
/** เพิ่มแต้มครั้งเดียวต่อ ref (กันซ้ำด้วย unique customer_id+ref) */
export async function addPoints(customer_id: string, delta: number, reason: string, ref: string): Promise<boolean> {
  if (!delta) return false;
  if (isDemo) { if (demo.points.some((p) => p.customer_id === customer_id && p.ref === ref)) return false; demo.points.unshift({ id: demo.points.length + 1, customer_id, delta, reason, ref, created_at: now() }); return true; }
  const { error } = await db().from("points_ledger").insert({ customer_id, delta, reason, ref });
  if (error?.code === "23505") return false;
  if (error) throw error;
  return true;
}
export async function pointsOf(customer_id: string): Promise<{ total: number; rows: PointRow[] }> {
  if (isDemo) { const rows = demo.points.filter((p) => p.customer_id === customer_id); return { total: rows.reduce((t, r) => t + r.delta, 0), rows: rows.slice(0, 30) }; }
  const { data } = await db().from("points_ledger").select().eq("customer_id", customer_id).order("created_at", { ascending: false }).limit(500);
  const rows = (data ?? []) as PointRow[];
  return { total: rows.reduce((t, r) => t + r.delta, 0), rows: rows.slice(0, 30) };
}
