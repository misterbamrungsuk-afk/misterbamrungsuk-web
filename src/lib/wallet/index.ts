import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SlipCheck } from "@/lib/slip2go";

// กระเป๋าเงิน (ledger บัญชีคู่) — ทุกการเคลื่อนไหวเงินผ่าน post() → Postgres function wallet_post (supabase/wallet/0001_wallet.sql)
// โหมดสาธิต (ไม่มี SUPABASE env): ledger ในหน่วยความจำ กติกาเดียวกัน (ผลรวม 0 · ห้ามติดลบ · กันซ้ำ)
export type OwnerType = "customer" | "parttime" | "partner" | "platform";
export type Leg = { owner_type: OwnerType; owner_id: string; bucket: string; amount: number };
export type TxKind = "topup" | "hold" | "confirm" | "release" | "split" | "mature" | "withdraw_req" | "withdraw_paid" | "withdraw_fail" | "refund" | "adjust" | "reversal";
export type Entry = { tx_id: number; kind: string; ref_type: string | null; ref_id: string | null; note: string | null; bucket: string; amount: number; created_at: string };
export type Topup = {
  id: string; customer_id: string; customer_email: string | null; amount_satang: number; slip_path: string | null; slip_check: SlipCheck | null;
  status: "pending" | "credited" | "rejected"; reason: string | null; tx_id: number | null; reviewed_by: string | null; created_at: string; reviewed_at: string | null;
};

export const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
export const PLATFORM = "mb";
export const baht = (satang: number) => satang / 100;
export const satang = (b: number) => Math.round(b * 100);

let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));

// ── โหมดสาธิต ──
type DemoAcc = { id: number; owner_type: string; owner_id: string; bucket: string };
type DemoState = { acc: DemoAcc[]; tx: { id: number; kind: string; ref_type: string | null; ref_id: string | null; idem: string | null; note: string | null; actor: string | null; created_at: string }[]; ent: { tx_id: number; account_id: number; amount: number; created_at: string }[]; topups: Topup[]; files: Map<string, { type: string; data: Buffer }> };
const g = globalThis as unknown as { __mbWallet?: DemoState };
const demo: DemoState = (g.__mbWallet ??= { acc: [], tx: [], ent: [], topups: [], files: new Map() } as DemoState);

export class WalletError extends Error {}

/** ทำรายการเงิน 1 ครั้ง (อะตอมมิก) — คืน tx id · idem ซ้ำ = คืนรายการเดิม */
export async function post(kind: TxKind, ref: { type?: string; id?: string } | null, idem: string | null, note: string | null, actor: string | null, legs: Leg[]): Promise<number> {
  const clean = legs.filter((l) => Number.isInteger(l.amount));
  if (clean.length !== legs.length) throw new WalletError("จำนวนเงินต้องเป็นสตางค์เต็ม");
  if (legs.reduce((s, l) => s + l.amount, 0) !== 0) throw new WalletError("รายการเงินไม่สมดุล");
  if (isDemo) {
    if (idem) { const ex = demo.tx.find((t) => t.idem === idem); if (ex) return ex.id; }
    const accOf = (l: Leg) => {
      let a = demo.acc.find((x) => x.owner_type === l.owner_type && x.owner_id === l.owner_id && x.bucket === l.bucket);
      if (!a) { a = { id: demo.acc.length + 1, owner_type: l.owner_type, owner_id: l.owner_id, bucket: l.bucket }; demo.acc.push(a); }
      return a;
    };
    for (const l of legs) {
      if (l.owner_type === "platform") continue;
      const a = accOf(l);
      const bal = demo.ent.filter((e) => e.account_id === a.id).reduce((s, e) => s + e.amount, 0);
      if (bal + legs.filter((x) => x.owner_type === l.owner_type && x.owner_id === l.owner_id && x.bucket === l.bucket).reduce((s, x) => s + x.amount, 0) < 0) throw new WalletError("ยอดเงินไม่พอ");
    }
    const id = demo.tx.length + 1, now = new Date().toISOString();
    demo.tx.push({ id, kind, ref_type: ref?.type ?? null, ref_id: ref?.id ?? null, idem, note, actor, created_at: now });
    for (const l of legs) if (l.amount) demo.ent.push({ tx_id: id, account_id: accOf(l).id, amount: l.amount, created_at: now });
    return id;
  }
  const { data, error } = await db().rpc("wallet_post", { p_kind: kind, p_ref_type: ref?.type ?? null, p_ref_id: ref?.id ?? null, p_idem: idem, p_note: note, p_actor: actor, p_legs: legs });
  if (error) {
    if (/insufficient balance/.test(error.message)) throw new WalletError("ยอดเงินไม่พอ");
    throw error;
  }
  return Number(data);
}

/** ยอดคงเหลือทุกช่องของเจ้าของ (สตางค์) */
export async function balances(owner_type: OwnerType, owner_id: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (isDemo) {
    for (const a of demo.acc.filter((x) => x.owner_type === owner_type && x.owner_id === owner_id))
      out[a.bucket] = demo.ent.filter((e) => e.account_id === a.id).reduce((s, e) => s + e.amount, 0);
    return out;
  }
  const { data, error } = await db().from("wallet_balances").select("bucket,balance_satang").eq("owner_type", owner_type).eq("owner_id", owner_id);
  if (error) throw error;
  for (const r of data ?? []) out[r.bucket as string] = Number(r.balance_satang);
  return out;
}

/** ยอดทุกบัญชี (หลังบ้าน) */
export async function allBalances(): Promise<{ owner_type: string; owner_id: string; bucket: string; balance: number }[]> {
  if (isDemo) return demo.acc.map((a) => ({ owner_type: a.owner_type, owner_id: a.owner_id, bucket: a.bucket, balance: demo.ent.filter((e) => e.account_id === a.id).reduce((s, e) => s + e.amount, 0) }));
  const { data, error } = await db().from("wallet_balances").select("owner_type,owner_id,bucket,balance_satang").order("owner_type");
  if (error) throw error;
  return (data ?? []).map((r) => ({ owner_type: r.owner_type, owner_id: r.owner_id, bucket: r.bucket, balance: Number(r.balance_satang) }));
}

/** ประวัติรายการของเจ้าของ ใหม่สุดก่อน */
export async function history(owner_type: OwnerType, owner_id: string, limit = 50): Promise<Entry[]> {
  if (isDemo) {
    const ids = new Map(demo.acc.filter((a) => a.owner_type === owner_type && a.owner_id === owner_id).map((a) => [a.id, a.bucket]));
    return demo.ent.filter((e) => ids.has(e.account_id)).map((e) => { const t = demo.tx.find((x) => x.id === e.tx_id)!; return { tx_id: e.tx_id, kind: t.kind, ref_type: t.ref_type, ref_id: t.ref_id, note: t.note, bucket: ids.get(e.account_id)!, amount: e.amount, created_at: e.created_at }; })
      .sort((a, b) => b.tx_id - a.tx_id).slice(0, limit);
  }
  const { data: accs, error: e1 } = await db().from("wallet_accounts").select("id,bucket").eq("owner_type", owner_type).eq("owner_id", owner_id);
  if (e1) throw e1;
  if (!accs?.length) return [];
  const bucketOf = new Map(accs.map((a) => [a.id as number, a.bucket as string]));
  const { data, error } = await db().from("wallet_entries").select("tx_id,account_id,amount_satang,created_at,wallet_tx(kind,ref_type,ref_id,note)").in("account_id", [...bucketOf.keys()]).order("id", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const t = (Array.isArray(r.wallet_tx) ? r.wallet_tx[0] : r.wallet_tx) as { kind: string; ref_type: string | null; ref_id: string | null; note: string | null } | null;
    return { tx_id: Number(r.tx_id), kind: t?.kind ?? "", ref_type: t?.ref_type ?? null, ref_id: t?.ref_id ?? null, note: t?.note ?? null, bucket: bucketOf.get(r.account_id as number) ?? "", amount: Number(r.amount_satang), created_at: r.created_at as string };
  });
}

/** รวมยอดทุกบัญชี — ต้องเป็น 0 เสมอ (รายงานกระทบยอด) */
export async function ledgerSum(): Promise<number> {
  if (isDemo) return demo.ent.reduce((s, e) => s + e.amount, 0);
  const rows = await allBalances();
  return rows.reduce((s, r) => s + r.balance, 0);
}

// ── เติมเงิน ──
const extOf = (f: File) => (f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg");
export async function saveSlip(customerId: string, f: File): Promise<string> {
  const path = `wallet/${customerId.replace(/[^a-zA-Z0-9_-]/g, "_")}/${Date.now()}.${extOf(f)}`;
  const data = Buffer.from(await f.arrayBuffer());
  if (isDemo) { demo.files.set(path, { type: f.type, data }); return path; }
  const { error } = await db().storage.from("slips").upload(path, data, { contentType: f.type, upsert: false });
  if (error) throw error;
  return path;
}
export async function readSlip(path: string): Promise<{ type: string; data: Buffer } | null> {
  if (isDemo) return demo.files.get(path) ?? null;
  const { data, error } = await db().storage.from("slips").download(path);
  if (error || !data) return null;
  return { type: data.type || "image/jpeg", data: Buffer.from(await data.arrayBuffer()) };
}

export async function createTopup(t: Pick<Topup, "customer_id" | "customer_email" | "amount_satang" | "slip_path" | "slip_check">): Promise<Topup> {
  if (isDemo) {
    const row: Topup = { id: crypto.randomUUID(), status: "pending", reason: null, tx_id: null, reviewed_by: null, created_at: new Date().toISOString(), reviewed_at: null, ...t };
    demo.topups.unshift(row);
    return row;
  }
  const { data, error } = await db().from("wallet_topups").insert(t).select().single();
  if (error) throw error;
  return data as Topup;
}
export async function getTopup(id: string): Promise<Topup | null> {
  if (isDemo) return demo.topups.find((t) => t.id === id) ?? null;
  const { data } = await db().from("wallet_topups").select().eq("id", id).maybeSingle();
  return (data as Topup) ?? null;
}
export async function listTopups(opts: { status?: Topup["status"]; customer?: string; limit?: number } = {}): Promise<Topup[]> {
  if (isDemo) return demo.topups.filter((t) => (!opts.status || t.status === opts.status) && (!opts.customer || t.customer_id === opts.customer)).slice(0, opts.limit ?? 200);
  let q = db().from("wallet_topups").select().order("created_at", { ascending: false }).limit(opts.limit ?? 200);
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.customer) q = q.eq("customer_id", opts.customer);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Topup[];
}
async function patchTopup(id: string, patch: Partial<Topup>, onlyPending = true): Promise<Topup | null> {
  if (isDemo) {
    const t = demo.topups.find((x) => x.id === id);
    if (!t || (onlyPending && t.status !== "pending")) return null;
    Object.assign(t, patch);
    return t;
  }
  let q = db().from("wallet_topups").update(patch).eq("id", id);
  if (onlyPending) q = q.eq("status", "pending");
  const { data, error } = await q.select().maybeSingle();
  if (error) throw error;
  return (data as Topup) ?? null;
}

/** เติมเงินเข้ากระเป๋าลูกค้า: platform.bank → customer.available (กันซ้ำด้วยรหัสคำขอ) */
export async function creditTopup(t: Topup, actor: string): Promise<Topup | null> {
  const tx = await post("topup", { type: "topup", id: t.id }, `topup:${t.id}`, `เติมเงิน ฿${baht(t.amount_satang).toLocaleString("en-US")}`, actor, [
    { owner_type: "platform", owner_id: PLATFORM, bucket: "bank", amount: -t.amount_satang },
    { owner_type: "customer", owner_id: t.customer_id, bucket: "available", amount: t.amount_satang },
  ]);
  return patchTopup(t.id, { status: "credited", tx_id: tx, reviewed_by: actor, reviewed_at: new Date().toISOString() });
}
export async function rejectTopup(id: string, actor: string, reason: string): Promise<Topup | null> {
  return patchTopup(id, { status: "rejected", reason, reviewed_by: actor, reviewed_at: new Date().toISOString() });
}

/** แอดมินปรับยอดพร้อมเหตุผล: platform.adjust ↔ บัญชีเป้าหมาย */
export async function adjust(target: { owner_type: OwnerType; owner_id: string; bucket: string }, amount: number, reason: string, actor: string, idem: string) {
  if (!reason.trim()) throw new WalletError("ต้องระบุเหตุผล");
  return post("adjust", { type: "adjust", id: `${target.owner_type}:${target.owner_id}` }, idem, reason.slice(0, 300), actor, [
    { owner_type: "platform", owner_id: PLATFORM, bucket: "adjust", amount: -amount },
    { ...target, amount },
  ]);
}
