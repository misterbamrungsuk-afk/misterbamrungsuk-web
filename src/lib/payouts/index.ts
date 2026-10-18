import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PLATFORM, WalletError, balances, history, move, type Leg } from "@/lib/wallet";
import { notify } from "@/lib/bookings";

// กระเป๋าแยกของพาร์ทเนอร์ (โรงแรม/สปา) และร้านค้า Marketplace + คำขอถอน
// รายได้เข้า <owner>.available (สปา = ค่าห้องเมื่อนัดจบ · ร้าน = ส่วนของร้านเมื่อออเดอร์สำเร็จ)
// ถอน: available → withdrawing (ขอ) → CEO อนุมัติ → แอดมินโอนแล้ว = withdrawing → platform.bank · ไม่อนุมัติ/โอนไม่สำเร็จ = คืน available
// ลูกค้าถอนยอดในกระเป๋า (ยกเว้นเครดิตโบนัส) ใช้ทางเดียวกัน owner_type = customer (ตรวจยอดถอนได้ที่ ./customer.ts)
export type PayoutOwner = "partner" | "vendor" | "customer";
export type Bank = { bank: string; account: string; name: string };
export type PayoutRequest = {
  id: string; owner_type: PayoutOwner; owner_id: string; owner_name: string; amount_satang: number; bank: Bank;
  status: "requested" | "approved" | "paid" | "failed" | "rejected"; approved_by: string | null; approved_at: string | null;
  note: string | null; created_at: string; paid_at: string | null;
};
export class PayoutError extends Error {}
export const OWNER_LABEL: Record<PayoutOwner, string> = { partner: "พาร์ทเนอร์", vendor: "ร้านค้า", customer: "ลูกค้า" };
export const MIN_PAYOUT = 10000; // ฿100

const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
const g = globalThis as unknown as { __mbPayoutDemo?: PayoutRequest[] };
const demo: PayoutRequest[] = (g.__mbPayoutDemo ??= []);
const now = () => new Date().toISOString();
const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const isOpen = (s: PayoutRequest["status"]) => s === "requested" || s === "approved";

export async function listPayoutRequests(opts: { owner_type?: PayoutOwner; owner_id?: string; status?: PayoutRequest["status"][] } = {}): Promise<PayoutRequest[]> {
  if (isDemo) return demo.filter((p) => (!opts.owner_type || p.owner_type === opts.owner_type) && (!opts.owner_id || p.owner_id === opts.owner_id) && (!opts.status || opts.status.includes(p.status)));
  let q = db().from("payout_requests").select().order("created_at", { ascending: false }).limit(300);
  if (opts.owner_type) q = q.eq("owner_type", opts.owner_type);
  if (opts.owner_id) q = q.eq("owner_id", opts.owner_id);
  if (opts.status) q = q.in("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, amount_satang: Number(r.amount_satang) })) as PayoutRequest[];
}
async function insertReq(row: Pick<PayoutRequest, "owner_type" | "owner_id" | "owner_name" | "amount_satang" | "bank">): Promise<PayoutRequest> {
  const full: PayoutRequest = { ...row, id: crypto.randomUUID(), status: "requested", approved_by: null, approved_at: null, note: null, created_at: now(), paid_at: null };
  if (isDemo) { if (demo.some((p) => p.owner_type === row.owner_type && p.owner_id === row.owner_id && isOpen(p.status))) throw new PayoutError("มีคำขอถอนที่รอดำเนินการอยู่แล้ว"); demo.unshift(full); return full; }
  const { data, error } = await db().from("payout_requests").insert(full).select().single();
  if (error?.code === "23505") throw new PayoutError("มีคำขอถอนที่รอดำเนินการอยู่แล้ว");
  // ยังไม่รัน supabase/wallet/0006_customer_withdraw.sql (owner_type customer ไม่ผ่าน check) — ไม่ให้พังเป็น 500
  if (error?.code === "23514") throw new PayoutError("ระบบถอนเงินยังไม่เปิดใช้งาน · ติดต่อทีมงานทาง LINE");
  if (error) throw error;
  return data as PayoutRequest;
}
async function dropReq(id: string) {
  if (isDemo) { const i = demo.findIndex((p) => p.id === id); if (i >= 0) demo.splice(i, 1); return; }
  await db().from("payout_requests").delete().eq("id", id).eq("status", "requested");
}
const demoRow = (id: string) => () => demo.find((x) => x.id === id);

/** สรุปกระเป๋า: ยอดถอนได้ · กำลังถอน · ประวัติเงินเข้า-ออก · คำขอถอน · บัญชีล่าสุด */
export async function walletOf(owner_type: PayoutOwner, owner_id: string) {
  const [bal, hist, reqs] = await Promise.all([
    balances(owner_type, owner_id).catch(() => ({} as Record<string, number>)),
    history(owner_type, owner_id, 30).catch(() => []),
    listPayoutRequests({ owner_type, owner_id }).catch(() => []),
  ]);
  return { available: bal.available ?? 0, withdrawing: bal.withdrawing ?? 0, history: hist, requests: reqs.slice(0, 20), lastBank: reqs[0]?.bank ?? null, min: MIN_PAYOUT };
}

export function cleanBank(b: unknown): Bank | null {
  const x = (b ?? {}) as Record<string, unknown>;
  const bank = String(x.bank ?? "").trim().slice(0, 60), account = String(x.account ?? "").replace(/[^\d-]/g, "").slice(0, 20), name = String(x.name ?? "").trim().slice(0, 80);
  return bank && account.replace(/-/g, "").length >= 10 && name ? { bank, account, name } : null;
}

/** เจ้าของกระเป๋าขอถอน (ทั้งก้อนหรือบางส่วน) → รอ CEO อนุมัติ
 *  opts.min = ขั้นต่ำ (สตางค์) · opts.max = เพดานที่ถอนได้ (สตางค์ — ลูกค้า: ยอดหักเครดิตโบนัสแล้ว) */
export async function requestPayout(owner_type: PayoutOwner, owner_id: string, owner_name: string, amountBaht: number, bankIn: unknown, opts: { min?: number; max?: number } = {}): Promise<PayoutRequest> {
  const bank = cleanBank(bankIn);
  if (!bank) throw new PayoutError("กรอกธนาคาร เลขบัญชี (10 หลักขึ้นไป) และชื่อบัญชี");
  const amt = Math.round(Number(amountBaht) * 100);
  const min = opts.min ?? MIN_PAYOUT;
  if (!(amt >= min)) throw new PayoutError(`ถอนขั้นต่ำ ${baht(min)}`);
  if (opts.max != null && amt > opts.max) throw new PayoutError(`ถอนได้สูงสุด ${baht(Math.max(0, opts.max))} (ไม่รวมเครดิตโบนัส)`);
  const row = await insertReq({ owner_type, owner_id, owner_name: owner_name.slice(0, 120), amount_satang: amt, bank });
  try {
    const r = await move<PayoutRequest>({ table: "payout_requests", id: row.id, from: ["requested"], patch: { status: "requested" }, demoRow: demoRow(row.id) },
      { kind: "payout", ref: { type: "payout_request", id: row.id }, idem: `preq:${row.id}`, note: `ขอถอน ${baht(amt)}`, actor: `${owner_type}:${owner_id}`, legs: [
        { owner_type, owner_id, bucket: "available", amount: -amt },
        { owner_type, owner_id, bucket: "withdrawing", amount: amt },
      ] });
    if (!r) throw new PayoutError("สร้างคำขอไม่สำเร็จ");
    await notify({ user_type: "admin", user_id: "ceo", kind: "payout_request", title: `ขอถอนเงิน${OWNER_LABEL[owner_type]} ${owner_name} ${baht(amt)} · รอ CEO อนุมัติ`, body: bank.bank, url: "/admin/payroll" }).catch(() => {});
    if (owner_type === "customer") await notify({ user_type: "customer", user_id: owner_id, kind: "withdraw", title: `ส่งคำขอถอน ${baht(amt)} แล้ว`, body: "รอทีมงานอนุมัติและโอนเข้าบัญชีของคุณ", url: "/wallet" }).catch(() => {});
    return r;
  } catch (e) {
    await dropReq(row.id).catch(() => {});
    if (e instanceof WalletError) throw new PayoutError("ยอดถอนได้ไม่พอ");
    throw e;
  }
}

/** CEO อนุมัติ (ชั้นที่ 1) */
export async function approvePayout(id: string, ceo: string): Promise<PayoutRequest> {
  let r: PayoutRequest | null;
  if (isDemo) { const p = demo.find((x) => x.id === id); r = p && p.status === "requested" ? Object.assign(p, { status: "approved" as const, approved_by: ceo, approved_at: now() }) : null; }
  else {
    const { data, error } = await db().from("payout_requests").update({ status: "approved", approved_by: ceo, approved_at: now() }).eq("id", id).eq("status", "requested").select().maybeSingle();
    if (error) throw error;
    r = (data as PayoutRequest) ?? null;
  }
  if (!r) throw new PayoutError("คำขอนี้ไม่ได้รออนุมัติ");
  await notify({ user_type: "admin", user_id: "finance", kind: "payout_request", title: `CEO อนุมัติถอนเงิน${OWNER_LABEL[r.owner_type]} · รอโอน`, body: `${r.owner_name} ${baht(Number(r.amount_satang))}`, url: "/admin/payouts" }).catch(() => {});
  if (r.owner_type === "customer") await notify({ user_type: "customer", user_id: r.owner_id, kind: "withdraw", title: `อนุมัติถอน ${baht(Number(r.amount_satang))} แล้ว`, body: "ทีมงานกำลังโอนเข้าบัญชีของคุณ", url: "/wallet" }).catch(() => {});
  return r;
}

/** ปิดคำขอ: paid = แอดมินโอนแล้ว (ต้อง CEO อนุมัติก่อน) · failed = โอนไม่สำเร็จ · rejected = CEO ไม่อนุมัติ → คืนยอดเข้ากระเป๋า */
export async function settlePayout(id: string, actor: string, to: "paid" | "failed" | "rejected", note = ""): Promise<PayoutRequest> {
  const w = (await listPayoutRequests()).find((x) => x.id === id);
  const from: PayoutRequest["status"][] = to === "paid" ? ["approved"] : to === "rejected" ? ["requested"] : ["approved"];
  if (!w || !from.includes(w.status)) throw new PayoutError(to === "paid" && w?.status === "requested" ? "รอ CEO อนุมัติก่อนโอน" : "คำขอนี้ไม่อยู่ในสถานะที่ทำรายการนี้ได้");
  const amt = Number(w.amount_satang);
  const legs: Leg[] = to === "paid"
    ? [{ owner_type: w.owner_type, owner_id: w.owner_id, bucket: "withdrawing", amount: -amt }, { owner_type: "platform", owner_id: PLATFORM, bucket: "bank", amount: amt }]
    : [{ owner_type: w.owner_type, owner_id: w.owner_id, bucket: "withdrawing", amount: -amt }, { owner_type: w.owner_type, owner_id: w.owner_id, bucket: "available", amount: amt }];
  const r = await move<PayoutRequest>({ table: "payout_requests", id, from, patch: to === "paid" ? { status: "paid", paid_at: now() } : { status: to, note: note.slice(0, 200) || null }, demoRow: demoRow(id) },
    { kind: "payout", ref: { type: "payout_request", id }, idem: `psettle:${id}`, note: to === "paid" ? `โอนแล้ว ${baht(amt)}` : `คืนยอด · ${note || (to === "rejected" ? "ไม่อนุมัติ" : "โอนไม่สำเร็จ")}`, actor, legs });
  if (!r) throw new PayoutError("คำขอนี้ปิดไปแล้ว");
  // ลูกค้า: แจ้งผลทุกครั้ง (โอนแล้ว / ไม่อนุมัติ / โอนไม่สำเร็จ = คืนเข้ากระเป๋า)
  if (r.owner_type === "customer") await notify({ user_type: "customer", user_id: r.owner_id, kind: "withdraw",
    title: to === "paid" ? `โอน ${baht(amt)} เข้าบัญชีแล้ว` : to === "rejected" ? "คำขอถอนไม่ได้รับอนุมัติ" : "โอนเงินไม่สำเร็จ",
    body: to === "paid" ? `${w.bank.bank} · ${w.bank.account}` : `${note ? `${note} · ` : ""}คืน ${baht(amt)} เข้ากระเป๋าแล้ว`, url: "/wallet" }).catch(() => {});
  return r;
}
