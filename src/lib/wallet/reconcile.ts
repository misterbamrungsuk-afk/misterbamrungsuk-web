import "server-only";
import { createClient } from "@supabase/supabase-js";
import { PLATFORM, allBalances, isDemo } from "@/lib/wallet";
import { listAll } from "@/lib/bookings";
import { listWithdrawals } from "@/lib/bookings/day";

// กระทบยอดรายวัน (#24) — ledger ต้องตรงกับสถานะการจองและคำขอถอน · ไม่ตรง = แจ้งแอดมิน
// เว็บจริงคำนวณใน SQL (wallet_recon · 0002_atomic.sql) ไม่ติดเพดานแถวของ API · โหมดสาธิตคำนวณในหน่วยความจำแบบเดียวกัน
export type Recon = { ok: boolean; at: string; issues: string[]; figures: Record<string, number> };

const ESCROW: string[] = ["accepted", "checked_in", "cancel_requested", "disputed"];
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
  return { ok: !issues.length, at: new Date().toISOString(), issues, figures: f };
}
