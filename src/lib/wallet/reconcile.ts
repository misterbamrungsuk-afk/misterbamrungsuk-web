import "server-only";
import { PLATFORM, allBalances } from "@/lib/wallet";
import { listAll } from "@/lib/bookings";
import { listWithdrawals } from "@/lib/bookings/day";

// กระทบยอดรายวัน (#24) — ledger ต้องตรงกับสถานะการจองและคำขอถอน · ไม่ตรง = แจ้งแอดมิน
export type Recon = { ok: boolean; at: string; issues: string[]; figures: Record<string, number> };

const ESCROW: string[] = ["accepted", "checked_in", "cancel_requested", "disputed"];
const baht = (s: number) => (s / 100).toLocaleString("th-TH", { minimumFractionDigits: 2 });

export async function reconcile(): Promise<Recon> {
  const [bal, bookings, wds] = await Promise.all([allBalances(), listAll(5000), listWithdrawals()]);
  const sum = (f: (r: (typeof bal)[number]) => boolean) => bal.filter(f).reduce((s, r) => s + r.balance, 0);
  const issues: string[] = [];

  const ledger = sum(() => true);
  if (ledger !== 0) issues.push(`ผลรวม ledger ไม่เป็น 0 (${baht(ledger)} บาท)`);

  const neg = bal.filter((r) => r.owner_type !== "platform" && r.balance < 0);
  for (const r of neg.slice(0, 10)) issues.push(`ยอดติดลบ ${r.owner_type}:${r.owner_id} ${r.bucket} ${baht(r.balance)} บาท`);

  const escrow = sum((r) => r.owner_type === "platform" && r.owner_id === PLATFORM && r.bucket === "escrow");
  const expEscrow = bookings.filter((b) => ESCROW.includes(b.status)).reduce((s, b) => s + b.total_satang, 0);
  if (escrow !== expEscrow) issues.push(`เงินพัก (escrow) ${baht(escrow)} ≠ การจองที่ยืนยันแล้ว ${baht(expEscrow)} บาท`);

  const held = sum((r) => r.owner_type === "customer" && r.bucket === "held");
  const expHeld = bookings.filter((b) => b.status === "requested").reduce((s, b) => s + b.total_satang, 0);
  if (held !== expHeld) issues.push(`เงินกันไว้ของลูกค้า ${baht(held)} ≠ คำขอจองที่รอตอบรับ ${baht(expHeld)} บาท`);

  const withdrawing = sum((r) => r.owner_type === "parttime" && r.bucket === "withdrawing");
  const expW = wds.filter((w) => w.status === "requested" || w.status === "batched").reduce((s, w) => s + w.amount_satang, 0);
  if (withdrawing !== expW) issues.push(`ยอดกำลังถอน ${baht(withdrawing)} ≠ คำขอถอนที่ค้าง ${baht(expW)} บาท`);

  return { ok: !issues.length, at: new Date().toISOString(), issues, figures: { ledger, escrow, expEscrow, held, expHeld, withdrawing, expW, negatives: neg.length } };
}
