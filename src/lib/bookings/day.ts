import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PLATFORM, balances, history, post, WalletError } from "@/lib/wallet";
import { getMoney } from "@/lib/wallet/settings";
import { getEarnings, pctFor } from "@/lib/join/earnings-settings";
import type { Applicant } from "@/lib/join/store";
import { BookingError, addEvent, getBooking, isDemo, notify, rawForParttime, sendMessage, transition, type Booking } from "./index";

// วันนัด → จบงาน → แบ่งเงิน → ปล่อยเงิน → ถอน (แผนข้อ 4 "ทางเดินเงิน")
// จบงาน: บริษัท.escrow → PT.pending (x% ของค่าบริการ) + บริษัท.revenue (ส่วนที่เหลือ) + บริษัท.partner_payable (ค่าห้อง)
// ครบเวลาปล่อยเงิน: PT.pending → PT.available · ถอน: available → withdrawing → (โอนแล้ว) bank สุทธิ + revenue ค่าธรรมเนียม + wht_payable

let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
const now = () => new Date().toISOString();

export type Review = { booking_id: string; parttime_id: string; customer_id: string; rating: number; tags: string[]; again: string | null; body: string | null; hidden: boolean; created_at: string };
export type Withdrawal = { id: string; parttime_id: string; parttime_mb: string; amount_satang: number; fee_satang: number; wht_satang: number; net_satang: number; bank: { bank: string; account: string; name: string }; status: "requested" | "batched" | "paid" | "failed"; batch_id: string | null; note: string | null; created_at: string; paid_at: string | null };
type DemoD = { reviews: Review[]; withdrawals: Withdrawal[] };
const g = globalThis as unknown as { __mbDay?: DemoD };
const demo: DemoD = (g.__mbDay ??= { reviews: [], withdrawals: [] } as DemoD);

/** ส่วนของ Part-Time จากการจองนี้ (ค่าบริการ × % + ทิป × % ทิป) — คำนวณซ้ำได้จากค่าที่บันทึกไว้ */
export async function ptAmount(b: Booking): Promise<number> {
  const cfg = await getEarnings();
  return Math.round(b.price_satang * (b.share_pct ?? 0) / 100) + Math.round((b.tip_satang ?? 0) * cfg.tipPct / 100);
}

async function completedThisMonth(parttime_id: string): Promise<number> {
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
  if (isDemo) {
    return rawForParttime(parttime_id).filter((b) => b.status === "completed" && b.completed_at && Date.parse(b.completed_at) >= +start).length;
  }
  const { count } = await db().from("bookings").select("id", { count: "exact", head: true }).eq("parttime_id", parttime_id).eq("status", "completed").gte("completed_at", start.toISOString());
  return count ?? 0;
}

/** แบ่งเงินเมื่อจบงาน (ครั้งเดียวต่อการจอง — กันซ้ำด้วย idem) */
async function split(b: Booking, actor: string, tip: number): Promise<Booking> {
  const cfg = await getEarnings();
  const pct = pctFor(cfg.tiers, (await completedThisMonth(b.parttime_id)) + 1);
  const ptShare = Math.round(b.price_satang * pct / 100);
  const r = await transition(b.id, ["accepted", "checked_in", "disputed", "cancel_requested"], { status: "completed", completed_at: now(), share_pct: pct, tip_satang: tip });
  if (!r) throw new BookingError("สถานะการจองเปลี่ยนไปแล้ว", "state");
  const legs = [
    { owner_type: "platform" as const, owner_id: PLATFORM, bucket: "escrow", amount: -b.total_satang },
    { owner_type: "parttime" as const, owner_id: b.parttime_id, bucket: "pending", amount: ptShare },
    { owner_type: "platform" as const, owner_id: PLATFORM, bucket: "revenue", amount: b.price_satang - ptShare },
  ];
  if (b.room_fee_satang) legs.push({ owner_type: "platform", owner_id: PLATFORM, bucket: "partner_payable", amount: b.room_fee_satang });
  await post("split", { type: "booking", id: b.id }, `split:${b.id}`, `แบ่งเงินนัด ${b.code} · ส่วนแบ่ง ${pct}%`, actor, legs);
  if (tip > 0) {
    const tipPt = Math.round(tip * cfg.tipPct / 100);
    await post("split", { type: "tip", id: b.id }, `tip:${b.id}`, `ทิปนัด ${b.code}`, actor, [
      { owner_type: "customer", owner_id: b.customer_id, bucket: "available", amount: -tip },
      { owner_type: "parttime", owner_id: b.parttime_id, bucket: "pending", amount: tipPt },
      { owner_type: "platform", owner_id: PLATFORM, bucket: "revenue", amount: tip - tipPt },
    ]);
  }
  await addEvent(b.id, "completed", actor, { pct, tip });
  const money = await getMoney();
  await notify({ user_type: "parttime", user_id: b.parttime_id, kind: "earning", title: `จบงาน ${b.code}`, body: `รายได้รอปล่อย · ถอนได้ใน ${money.releaseHours} ชม.`, url: `/join/profile/${b.parttime_mb}/earnings` });
  return r;
}

/** อ่านแล้วจัดการอัตโนมัติ: Part-Time จบงานแล้วลูกค้าไม่ค้านเกินกำหนด = จบงาน · จบงานครบเวลาปล่อยเงิน = ถอนได้ */
export async function sweepDay(rows: Booking[]): Promise<Booking[]> {
  const m = await getMoney();
  const out: Booking[] = [];
  for (let b of rows) {
    try {
      if ((b.status === "checked_in" || b.status === "accepted") && b.pt_done_at && Date.parse(b.pt_done_at) + m.autoCompleteHours * 3600_000 < Date.now()) b = await split(b, "system:auto-complete", 0);
      if (b.status === "completed" && !b.matured_at && b.completed_at && Date.parse(b.completed_at) + m.releaseHours * 3600_000 < Date.now()) {
        const amt = await ptAmount(b);
        if (amt > 0) await post("mature", { type: "booking", id: b.id }, `mature:${b.id}`, `ปล่อยรายได้ ${b.code}`, "system", [
          { owner_type: "parttime", owner_id: b.parttime_id, bucket: "pending", amount: -amt },
          { owner_type: "parttime", owner_id: b.parttime_id, bucket: "available", amount: amt },
        ]);
        b = (await transition(b.id, ["completed"], { matured_at: now() })) ?? b;
      }
    } catch (e) { console.error("sweepDay", b.id, e); }
    out.push(b);
  }
  return out;
}

// ── วันนัด ──
export async function checkIn(id: string, parttime_id: string) {
  const b = await getBooking(id);
  if (!b || b.parttime_id !== parttime_id) throw new BookingError("ไม่พบงานนี้", "notfound");
  if (Date.parse(b.starts_at) - Date.now() > 2 * 3600_000) throw new BookingError("เช็กอินได้ก่อนเวลานัดไม่เกิน 2 ชม.");
  const r = await transition(b.id, ["accepted"], { status: "checked_in", checked_in_at: now() });
  if (!r) throw new BookingError("เช็กอินไม่ได้ในสถานะนี้", "state");
  await addEvent(b.id, "checked_in", `parttime:${parttime_id}`);
  await notify({ user_type: "customer", user_id: b.customer_id, kind: "booking_checked_in", title: `${b.parttime_nick ?? "เพื่อน"} ถึงจุดนัดแล้ว`, body: b.place.detail, url: `/order/${b.id}` });
  await sendMessage(b, "system", null, `${b.parttime_nick ?? "เพื่อน"} ถึงจุดนัดแล้ว · มีเหตุฉุกเฉินกด SOS ได้ตลอด`);
  return r;
}
export async function ptDone(id: string, parttime_id: string) {
  const b = await getBooking(id);
  if (!b || b.parttime_id !== parttime_id) throw new BookingError("ไม่พบงานนี้", "notfound");
  const r = await transition(b.id, ["checked_in", "accepted"], { pt_done_at: now() });
  if (!r) throw new BookingError("จบงานไม่ได้ในสถานะนี้", "state");
  const m = await getMoney();
  await addEvent(b.id, "pt_done", `parttime:${parttime_id}`);
  await notify({ user_type: "customer", user_id: b.customer_id, kind: "booking_pt_done", title: "เพื่อนแจ้งจบงานแล้ว", body: `ยืนยันจบงานและรีวิว · ถ้าไม่ตอบใน ${m.autoCompleteHours} ชม. ระบบยืนยันให้อัตโนมัติ`, url: `/order/${b.id}/complete` });
  return r;
}

/** ลูกค้ายืนยันจบงาน + รีวิว + ทิป (บอร์ด C-Complete) */
export async function customerComplete(id: string, customer_id: string, rv: { rating: number; tags: string[]; again: string; body: string; tip: number }) {
  const b = await getBooking(id);
  if (!b || b.customer_id !== customer_id) throw new BookingError("ไม่พบการจอง", "notfound");
  if (!["accepted", "checked_in"].includes(b.status)) throw new BookingError("ยืนยันจบงานไม่ได้ในสถานะนี้", "state");
  if (b.status === "accepted" && Date.parse(b.starts_at) > Date.now()) throw new BookingError("ยังไม่ถึงเวลานัด");
  const tip = Math.max(0, Math.round(rv.tip) * 100);
  if (tip > 0 && ((await balances("customer", customer_id)).available ?? 0) < tip) throw new BookingError("ยอดในกระเป๋าไม่พอสำหรับทิป");
  const r = await split(b, `customer:${customer_id}`, tip);
  if (rv.rating >= 1 && rv.rating <= 5) await saveReview({ booking_id: b.id, parttime_id: b.parttime_id, customer_id, rating: Math.round(rv.rating), tags: rv.tags.slice(0, 6).map((t) => t.slice(0, 20)), again: rv.again.slice(0, 10) || null, body: rv.body.trim().slice(0, 500) || null, hidden: false, created_at: now() });
  return r;
}
export async function dispute(id: string, customer_id: string, text: string) {
  const b = await getBooking(id);
  if (!b || b.customer_id !== customer_id) throw new BookingError("ไม่พบการจอง", "notfound");
  if (!text.trim()) throw new BookingError("เล่าปัญหาสั้น ๆ ให้ทีมงานทราบ");
  const r = await transition(b.id, ["accepted", "checked_in"], { status: "disputed", resolution: { dispute: text.slice(0, 1000), at: now() } });
  if (!r) throw new BookingError("แจ้งปัญหาไม่ได้ในสถานะนี้ · ติดต่อทีมงานทาง LINE", "state");
  await addEvent(b.id, "disputed", `customer:${customer_id}`, { text });
  return r;
}

/** แอดมินตัดสินคำขอยกเลิก/ข้อพิพาท: refundPct = % ยอดรวมที่คืนลูกค้า · ส่วนที่เหลือแบ่งตามปกติ · reject = กลับเป็นยืนยันแล้ว */
export async function adminResolve(id: string, admin: string, d: { action: "refund" | "reject"; refundPct: number; note: string }) {
  const b = await getBooking(id);
  if (!b) throw new BookingError("ไม่พบการจอง", "notfound");
  if (!["cancel_requested", "disputed"].includes(b.status)) throw new BookingError("การจองนี้ไม่ได้รอตัดสิน", "state");
  if (d.action === "reject") {
    const r = await transition(b.id, ["cancel_requested", "disputed"], { status: "accepted", resolution: { ...(b.resolution ?? {}), decided: "reject", note: d.note, by: admin, at: now() } });
    await addEvent(b.id, "resolve_reject", admin, d);
    await notify({ user_type: "customer", user_id: b.customer_id, kind: "booking_resolved", title: `ผลพิจารณา ${b.code}`, body: d.note || "นัดยังคงอยู่ตามเดิม", url: `/order/${b.id}` });
    return r;
  }
  const pct = Math.max(0, Math.min(100, Math.round(d.refundPct)));
  const refund = Math.round(b.total_satang * pct / 100);
  const rest = b.total_satang - refund;
  const cfg = await getEarnings();
  const sharePct = pctFor(cfg.tiers, (await completedThisMonth(b.parttime_id)) + 1);
  const ptShare = Math.round(rest * sharePct / 100);
  const legs = [{ owner_type: "platform" as const, owner_id: PLATFORM, bucket: "escrow", amount: -b.total_satang }];
  if (refund) legs.push({ owner_type: "customer", owner_id: b.customer_id, bucket: "available", amount: refund } as never);
  if (ptShare) legs.push({ owner_type: "parttime", owner_id: b.parttime_id, bucket: "pending", amount: ptShare } as never);
  if (rest - ptShare) legs.push({ owner_type: "platform", owner_id: PLATFORM, bucket: "revenue", amount: rest - ptShare });
  await post(pct === 100 ? "refund" : "split", { type: "booking", id: b.id }, `split:${b.id}`, `ผลพิจารณา ${b.code} · คืนลูกค้า ${pct}%`, admin, legs);
  const r = await transition(b.id, ["cancel_requested", "disputed"], {
    status: pct === 100 ? "refunded" : "completed", completed_at: now(), share_pct: pct === 100 ? 0 : sharePct, price_satang: b.price_satang,
    resolution: { ...(b.resolution ?? {}), decided: "refund", refund_pct: pct, refund_satang: refund, pt_satang: ptShare, note: d.note, by: admin, at: now() },
    ...(ptShare ? {} : { matured_at: now() }),
  });
  await addEvent(b.id, "resolve_refund", admin, { pct, refund, ptShare });
  await notify({ user_type: "customer", user_id: b.customer_id, kind: "booking_resolved", title: `ผลพิจารณา ${b.code}`, body: refund ? `คืนเงิน ${(refund / 100).toLocaleString()} บาทเข้ากระเป๋าแล้ว` : d.note, url: `/order/${b.id}` });
  return r;
}

// ── รีวิว ──
export async function saveReview(r: Review) {
  if (isDemo) { if (!demo.reviews.some((x) => x.booking_id === r.booking_id)) demo.reviews.unshift(r); return; }
  const { error } = await db().from("reviews").insert(r);
  if (error && !/duplicate/.test(error.message)) throw error;
}
export async function reviewsFor(parttime_id: string): Promise<Review[]> {
  if (isDemo) return demo.reviews.filter((r) => r.parttime_id === parttime_id && !r.hidden);
  const { data } = await db().from("reviews").select().eq("parttime_id", parttime_id).eq("hidden", false).order("created_at", { ascending: false }).limit(50);
  return (data ?? []) as Review[];
}

// ── ถอนเงิน (Part-Time) ──
export async function ptWallet(parttime_id: string) {
  const [b, h] = await Promise.all([balances("parttime", parttime_id), history("parttime", parttime_id, 50)]);
  return { pending: b.pending ?? 0, available: b.available ?? 0, withdrawing: b.withdrawing ?? 0, history: h };
}
export async function requestWithdraw(a: Applicant, amountBaht: number): Promise<Withdrawal> {
  const m = await getMoney();
  const amount = Math.round(amountBaht) * 100;
  if (!Number.isFinite(amount) || amount < m.minWithdraw * 100) throw new BookingError(`ถอนขั้นต่ำ ฿${m.minWithdraw.toLocaleString()}`);
  if (!a.bank_account || !a.bank) throw new BookingError("ยังไม่มีบัญชีรับเงิน · กรอกที่ ยืนยันตัวตน + บัญชีรับเงิน");
  const open = isDemo ? demo.withdrawals.filter((w) => w.parttime_id === a.id && w.status === "requested") : (((await db().from("withdrawals").select("id").eq("parttime_id", a.id).eq("status", "requested")).data) ?? []);
  if (open.length) throw new BookingError("มีคำขอถอนที่รอโอนอยู่แล้ว · รอรอบโอนถัดไป");
  const fee = Math.round(amount * m.feePct / 100), wht = Math.round(amount * m.whtPct / 100);
  const row: Omit<Withdrawal, "id" | "created_at" | "paid_at"> = { parttime_id: a.id, parttime_mb: a.mb_code, amount_satang: amount, fee_satang: fee, wht_satang: wht, net_satang: amount - fee - wht, bank: { bank: a.bank, account: a.bank_account, name: a.bank_account_name }, status: "requested", batch_id: null, note: null };
  const id = crypto.randomUUID();
  try {
    await post("withdraw_req", { type: "withdrawal", id }, `wreq:${id}`, `ขอถอน ฿${amountBaht.toLocaleString()}`, `parttime:${a.id}`, [
      { owner_type: "parttime", owner_id: a.id, bucket: "available", amount: -amount },
      { owner_type: "parttime", owner_id: a.id, bucket: "withdrawing", amount },
    ]);
  } catch (e) { if (e instanceof WalletError) throw new BookingError("ยอดถอนได้ไม่พอ"); throw e; }
  if (isDemo) { const w: Withdrawal = { ...row, id, created_at: now(), paid_at: null }; demo.withdrawals.unshift(w); return w; }
  const { data, error } = await db().from("withdrawals").insert({ ...row, id }).select().single();
  if (error) throw error;
  return data as Withdrawal;
}
export async function listWithdrawals(opts: { parttime_id?: string; status?: Withdrawal["status"] } = {}): Promise<Withdrawal[]> {
  if (isDemo) return demo.withdrawals.filter((w) => (!opts.parttime_id || w.parttime_id === opts.parttime_id) && (!opts.status || w.status === opts.status));
  let q = db().from("withdrawals").select().order("created_at", { ascending: false }).limit(300);
  if (opts.parttime_id) q = q.eq("parttime_id", opts.parttime_id);
  if (opts.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Withdrawal[];
}
async function patchW(id: string, from: Withdrawal["status"][], patch: Partial<Withdrawal>): Promise<Withdrawal | null> {
  if (isDemo) { const w = demo.withdrawals.find((x) => x.id === id); if (!w || !from.includes(w.status)) return null; Object.assign(w, patch); return w; }
  const { data, error } = await db().from("withdrawals").update(patch).eq("id", id).in("status", from).select().maybeSingle();
  if (error) throw error;
  return (data as Withdrawal) ?? null;
}
/** สร้างรอบโอน: คำขอที่รออยู่ทั้งหมด → batched + คืนข้อมูลสำหรับไฟล์โอนกลุ่ม */
export async function makeBatch(admin: string) {
  const reqs = await listWithdrawals({ status: "requested" });
  const batch = `B${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const done: Withdrawal[] = [];
  for (const w of reqs) { const r = await patchW(w.id, ["requested"], { status: "batched", batch_id: batch, note: `by ${admin}` }); if (r) done.push(r); }
  return { batch, rows: done };
}
export async function markPaid(id: string, admin: string) {
  const w = (await listWithdrawals()).find((x) => x.id === id);
  if (!w || !["requested", "batched"].includes(w.status)) throw new BookingError("คำขอนี้ไม่ได้รอโอน", "state");
  await post("withdraw_paid", { type: "withdrawal", id }, `wpaid:${id}`, `โอนแล้ว ฿${(w.net_satang / 100).toLocaleString()}`, admin, [
    { owner_type: "parttime", owner_id: w.parttime_id, bucket: "withdrawing", amount: -w.amount_satang },
    { owner_type: "platform", owner_id: PLATFORM, bucket: "bank", amount: w.net_satang },
    { owner_type: "platform", owner_id: PLATFORM, bucket: "revenue", amount: w.fee_satang },
    { owner_type: "platform", owner_id: PLATFORM, bucket: "wht_payable", amount: w.wht_satang },
  ]);
  const r = await patchW(id, ["requested", "batched"], { status: "paid", paid_at: now() });
  await notify({ user_type: "parttime", user_id: w.parttime_id, kind: "withdraw_paid", title: "โอนเงินแล้ว", body: `฿${(w.net_satang / 100).toLocaleString()} เข้าบัญชี ${w.bank.bank}`, url: `/join/profile/${w.parttime_mb}/earnings` });
  return r;
}
export async function markFailed(id: string, admin: string, note: string) {
  const w = (await listWithdrawals()).find((x) => x.id === id);
  if (!w || !["requested", "batched"].includes(w.status)) throw new BookingError("คำขอนี้ไม่ได้รอโอน", "state");
  await post("withdraw_fail", { type: "withdrawal", id }, `wfail:${id}`, `โอนไม่สำเร็จ · ${note}`, admin, [
    { owner_type: "parttime", owner_id: w.parttime_id, bucket: "withdrawing", amount: -w.amount_satang },
    { owner_type: "parttime", owner_id: w.parttime_id, bucket: "available", amount: w.amount_satang },
  ]);
  return patchW(id, ["requested", "batched"], { status: "failed", note: note.slice(0, 200) });
}
