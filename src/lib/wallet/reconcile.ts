import "server-only";
import { createClient } from "@supabase/supabase-js";
import { PLATFORM, allBalances, history, isDemo } from "@/lib/wallet";
import { listAll } from "@/lib/bookings";
import { listWithdrawals } from "@/lib/bookings/day";

// กระทบยอดรายวัน (#24) — ledger ต้องตรงกับสถานะการจองและคำขอถอน · ไม่ตรง = แจ้งแอดมิน
// เว็บจริงคำนวณใน SQL (wallet_recon · 0002_atomic.sql) ไม่ติดเพดานแถวของ API · โหมดสาธิตคำนวณในหน่วยความจำแบบเดียวกัน
export type Recon = { ok: boolean; at: string; issues: string[]; figures: Record<string, number>; skipped?: string[] };

const ESCROW: string[] = ["accepted", "checked_in", "cancel_requested", "disputed"];
const MARKET_ESCROW = "market_escrow"; // = MARKET_ESCROW ใน src/lib/market/store.ts
const baht = (s: number) => (s / 100).toLocaleString("th-TH", { minimumFractionDigits: 2 });

async function figures(): Promise<Record<string, number>> {
  if (!isDemo) {
    const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const { data, error } = await db.rpc("wallet_recon");
    if (error) throw error;
    return Object.fromEntries(Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, Number(v)]));
  }
  const [bal, bookings, wds] = await Promise.all([allBalances(), listAll(5000), listWithdrawals()]);
  const sum = (f: (r: (typeof bal)[number]) => boolean) => bal.filter(f).reduce((s, r) => s + r.balance, 0);
  const unmatured = bookings.filter((b) => (b.status === "completed" || b.status === "refunded") && !b.matured_at);
  return {
    ledger: sum(() => true),
    escrow: sum((r) => r.owner_type === "platform" && r.owner_id === PLATFORM && r.bucket === "escrow"),
    expEscrow: bookings.filter((b) => ESCROW.includes(b.status)).reduce((s, b) => s + b.total_satang, 0),
    held: sum((r) => r.owner_type === "customer" && r.bucket === "held"),
    expHeld: bookings.filter((b) => b.status === "requested").reduce((s, b) => s + b.total_satang, 0) + (await import("@/lib/bookings/quick")).openHolds(),
    withdrawing: sum((r) => r.owner_type === "parttime" && r.bucket === "withdrawing"),
    expW: wds.filter((w) => w.status === "requested" || w.status === "approved" || w.status === "batched").reduce((s, w) => s + w.amount_satang, 0),
    ptPending: sum((r) => r.owner_type === "parttime" && r.bucket === "pending"),
    expPtPending: unmatured.reduce((s, b) => s + (b.pt_pending_satang ?? 0), 0),
    unknownPending: unmatured.filter((b) => b.pt_pending_satang == null).length,
    gift: sum((r) => r.owner_type === "platform" && r.bucket === "gift_liability"),
    expGift: (await (await import("@/lib/codes")).listCodes()).filter((c) => c.kind === "gift").reduce((t, c) => t + c.amount_satang * (c.max_uses - c.used), 0),
    negatives: bal.filter((r) => r.owner_type !== "platform" && r.balance < 0).length,
  };
}

export async function reconcile(): Promise<Recon> {
  const f = await figures();
  const issues: string[] = [];
  if (f.ledger !== 0) issues.push(`ผลรวม ledger ไม่เป็น 0 (${baht(f.ledger)} บาท)`);
  if (f.negatives) issues.push(`มีบัญชียอดติดลบ ${f.negatives} บัญชี`);
  if (f.escrow !== f.expEscrow) issues.push(`เงินพัก (escrow) ${baht(f.escrow)} ≠ การจองที่ยืนยันแล้ว ${baht(f.expEscrow)} บาท`);
  if (f.held !== f.expHeld) issues.push(`เงินกันไว้ของลูกค้า ${baht(f.held)} ≠ คำขอจองที่รอตอบรับ + เรียกด่วน ${baht(f.expHeld)} บาท`);
  if (f.withdrawing !== f.expW) issues.push(`ยอดกำลังถอน ${baht(f.withdrawing)} ≠ คำขอถอนค้าง ${baht(f.expW)} บาท`);
  if ((f.gift ?? 0) !== (f.expGift ?? 0)) issues.push(`บัตรของขวัญค้างใช้ ${baht(f.gift ?? 0)} ≠ มูลค่าบัตรที่ยังไม่ถูกใช้ ${baht(f.expGift ?? 0)} บาท`);
  // นัดเก่าก่อน 0002 ไม่มี pt_pending_satang → ข้ามการเทียบช่องนี้จนกว่าจะปล่อยเงินครบ
  if (!f.unknownPending && f.ptPending !== f.expPtPending) issues.push(`รายได้ Part-Time รอปล่อย ${baht(f.ptPending)} ≠ ที่ควรเป็น ${baht(f.expPtPending)} บาท`);
  // ร้านค้า + ห้องพัก: อ่านไม่ได้ (เช่นยังไม่รัน migration) = ข้ามช่องนั้น ไม่นับเป็นยอดไม่ตรง
  const skipped: string[] = [];
  const [mk, ht] = await Promise.all([
    marketFigures().catch((e) => { console.error("recon market", e); skipped.push("market_escrow"); return null; }),
    hotelFigures().catch((e) => { console.error("recon hotel", e); skipped.push("hotel_escrow"); return null; }),
  ]);
  if (mk) {
    Object.assign(f, mk);
    if (mk.marketEscrow !== mk.expMarket) issues.push(`เงินพักร้านค้า (market_escrow) ${baht(mk.marketEscrow)} ≠ ออเดอร์จ่ายด้วยกระเป๋าที่ยังไม่จบ ${baht(mk.expMarket)} บาท`);
    if (mk.marketBadOrders) issues.push(`ออเดอร์ร้านค้าจ่ายด้วยกระเป๋า ${mk.marketBadOrders} รายการ เงินพักไม่ตรงกับสถานะ`);
    if (mk.marketRefundDue) issues.push(`ออเดอร์ร้านค้าที่ปฏิเสธแล้ว ยังคืนเงินลูกค้าไม่สำเร็จ ${baht(mk.marketRefundDue)} บาท`);
  }
  if (ht) {
    Object.assign(f, ht);
    if (ht.hotelEscrow !== ht.expHotel) issues.push(`เงินพักห้องพัก (hotel_escrow) ${baht(ht.hotelEscrow)} ≠ การจองห้องที่รอยืนยัน/ยืนยันแล้ว ${baht(ht.expHotel)} บาท`);
  }
  return { ok: !issues.length, at: new Date().toISOString(), issues, figures: f, ...(skipped.length ? { skipped } : {}) };
}

// ── เงินพักร้านค้า (market_escrow) + ห้องพัก (hotel_escrow) — คิดใน JS ทั้งสองโหมด (wallet_recon ใน SQL ยังไม่มีช่องนี้) ──
/** ยอดคงค้างใน platform.market_escrow แยกต่อออเดอร์ (ref_id) จาก ledger จริง */
async function marketEscrowByOrder(): Promise<{ total: number; byOrder: Map<string, number> }> {
  const byOrder = new Map<string, number>();
  let total = 0;
  const add = (ref: string | null, amt: number) => { total += amt; const k = ref ?? "?"; byOrder.set(k, (byOrder.get(k) ?? 0) + amt); };
  if (isDemo) {
    for (const e of await history("platform", PLATFORM, 1_000_000)) if (e.bucket === MARKET_ESCROW) add(e.ref_id, e.amount);
    return { total, byOrder };
  }
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: acc, error: e1 } = await db.from("wallet_accounts").select("id").eq("owner_type", "platform").eq("owner_id", PLATFORM).eq("bucket", MARKET_ESCROW).maybeSingle();
  if (e1) throw e1;
  if (!acc) return { total, byOrder };
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await db.from("wallet_entries").select("amount_satang,wallet_tx(ref_id)").eq("account_id", acc.id).order("id").range(from, from + 999);
    if (error) throw error;
    for (const r of data ?? []) { const t = (Array.isArray(r.wallet_tx) ? r.wallet_tx[0] : r.wallet_tx) as { ref_id: string | null } | null; add(t?.ref_id ?? null, Number(r.amount_satang)); }
    if ((data ?? []).length < 1000) break;
  }
  return { total, byOrder };
}

/** market: ยอดที่ควรพักไว้ = ออเดอร์จ่ายด้วยกระเป๋าที่ยืนยัน/จัดส่งแล้ว (ยอดเต็ม) + สำเร็จแล้วแต่ยังไม่ลงเงินร้าน (ร้านยังไม่ตั้ง GP) + ปฏิเสธแต่ยังคืนเงินไม่สำเร็จ */
async function marketFigures(): Promise<Record<string, number>> {
  const { listOrders } = await import("@/lib/market/store");
  const [{ total, byOrder }, orders] = await Promise.all([marketEscrowByOrder(), listOrders()]);
  let expMarket = 0, marketDoneUncredited = 0, marketRefundDue = 0, marketBadOrders = 0;
  const known = new Set<string>();
  for (const o of orders) {
    if (o.pay_method !== "wallet") continue;
    known.add(o.id);
    const amt = Math.round(Number(o.total) * 100), net = byOrder.get(o.id) ?? 0;
    if (o.status === "paid" || o.status === "shipped") { expMarket += amt; if (net !== amt) marketBadOrders++; }
    else if (o.status === "done") { if (net === amt) { expMarket += amt; marketDoneUncredited += amt; } else if (net !== 0) marketBadOrders++; }
    else if (net > 0) { expMarket += net; marketRefundDue += net; } // pending/rejected ไม่ควรมีเงินค้าง
  }
  const orphan = [...byOrder].filter(([k, v]) => v !== 0 && !known.has(k)).reduce((s, [, v]) => s + v, 0);
  return { marketEscrow: total, expMarket, marketDoneUncredited, marketRefundDue, marketBadOrders, marketOrphan: orphan };
}

async function hotelFigures(): Promise<Record<string, number>> {
  const r = await (await import("@/lib/hotels/store")).stayRecon();
  return { hotelEscrow: r.escrow, expHotel: r.expected };
}
