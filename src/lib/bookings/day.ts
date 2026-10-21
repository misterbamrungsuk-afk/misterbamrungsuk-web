import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PLATFORM, balances, history, move, WalletError, type Leg } from "@/lib/wallet";
import { getMoney } from "@/lib/wallet/settings";
import { getEarnings, pctFor } from "@/lib/join/earnings-settings";
import type { Applicant } from "@/lib/join/store";
import { BookingError, addEvent, getBooking, isDemo, moveBooking, notify, rawForParttime, sendMessage, transition, type Booking } from "./index";

// วันนัด → จบงาน → แบ่งเงิน → ปล่อยเงิน → ถอน (แผนข้อ 4 "ทางเดินเงิน")
// จบงาน: บริษัท.escrow → PT.pending (x% ของค่าบริการ) + บริษัท.revenue (ส่วนที่เหลือ) + สปาพาร์ทเนอร์.available (ค่าห้อง)
// ครบเวลาปล่อยเงิน: PT.pending → PT.available · ถอน: available → withdrawing → (โอนแล้ว) bank สุทธิ + revenue ค่าธรรมเนียม + wht_payable

let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
const now = () => new Date().toISOString();

export type Review = { booking_id: string; parttime_id: string; customer_id: string; rating: number; tags: string[]; again: string | null; body: string | null; hidden: boolean; created_at: string };
export type Withdrawal = { id: string; parttime_id: string; parttime_mb: string; amount_satang: number; fee_satang: number; wht_satang: number; net_satang: number; bank: { bank: string; account: string; name: string }; status: "requested" | "approved" | "batched" | "paid" | "failed"; batch_id: string | null; note: string | null; created_at: string; paid_at: string | null; approved_by?: string | null; approved_at?: string | null };
type DemoD = { reviews: Review[]; withdrawals: Withdrawal[] };
const g = globalThis as unknown as { __mbDay?: DemoD };
const demo: DemoD = (g.__mbDay ??= { reviews: [], withdrawals: [] } as DemoD);

/** ส่วนของ Part-Time จากการจองนี้ (ค่าบริการ × % + ทิป × % ทิป) — คำนวณซ้ำได้จากค่าที่บันทึกไว้ */
export async function ptAmount(b: Booking): Promise<number> {
  if (typeof b.pt_pending_satang === "number") return b.pt_pending_satang; // ยอดที่ลงจริงตอนแบ่งเงิน (0002_atomic)
  const cfg = await getEarnings();
  return Math.round(b.price_satang * (b.share_pct ?? 0) / 100) + Math.round((b.tip_satang ?? 0) * cfg.tipPct / 100);
}

async function completedThisMonth(parttime_id: string): Promise<number> {
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
  return completedBetween(parttime_id, start);
}

/** จำนวนงานที่จบสมบูรณ์ (completed) ในช่วงเวลา [from, to) */
export async function completedBetween(parttime_id: string, from: Date, to?: Date): Promise<number> {
  if (isDemo) {
    return rawForParttime(parttime_id).filter((b) => b.status === "completed" && b.completed_at && Date.parse(b.completed_at) >= +from && (!to || Date.parse(b.completed_at) < +to)).length;
  }
  let q = db().from("bookings").select("id", { count: "exact", head: true }).eq("parttime_id", parttime_id).eq("status", "completed").gte("completed_at", from.toISOString());
  if (to) q = q.lt("completed_at", to.toISOString());
  const { count } = await q;
  return count ?? 0;
}

/** แบ่งเงินเมื่อจบงาน (ครั้งเดียวต่อการจอง) — เปลี่ยนสถานะ + ลงเงิน (ค่านัด + ทิป) ใน transaction เดียว
 *  เฉพาะนัดที่ยังดำเนินอยู่ (accepted/checked_in) — ข้อพิพาท/ขอยกเลิก ต้องให้แอดมินตัดสิน (adminResolve) เท่านั้น
 *  ทิปตัดจากกระเป๋าลูกค้าไม่ได้ (ยอดไม่พอ) = จบงานโดยไม่มีทิป · pt_pending_satang = ยอดที่เข้า PT.pending จริง */
/** ค่าห้องเข้ากระเป๋าของสปาพาร์ทเนอร์เจ้านั้นโดยตรง (ถอนเองผ่านพอร์ทัล) · สถานที่ที่ไม่ใช่พาร์ทเนอร์ = ค้างจ่ายรวมของบริษัท */
/** ค่าห้องสปา → กระเป๋าพาร์ทเนอร์ หัก % แพลตฟอร์ม (ตามที่ตกลงกับพาร์ทเนอร์ · snapshot ตอนรับนัด) เข้า revenue
 *  สปาที่ไม่ใช่พาร์ทเนอร์ในระบบ = พักไว้ partner_payable ทั้งก้อน */
async function roomLegs(b: Booking, amount: number): Promise<Leg[]> {
  if (!amount) return [];
  const pid = b.place?.spa_id;
  const ok = !!pid && (/^[0-9a-f-]{36}$/.test(pid) || !process.env.SUPABASE_URL);
  if (!ok) return [{ owner_type: "platform", owner_id: PLATFORM, bucket: "partner_payable", amount }];
  const pct = await (await import("@/lib/partner/portal")).bookingPlatformPct(b.code, pid!).catch(() => 0);
  const keep = Math.round(amount * pct / 100);
  return [
    { owner_type: "partner", owner_id: pid!, bucket: "available", amount: amount - keep },
    { owner_type: "platform", owner_id: PLATFORM, bucket: "revenue", amount: keep },
  ].filter((l) => l.amount !== 0) as Leg[];
}

/** กันแข่งกับ "ต่อเวลา": แบ่งเงินจากภาพนิ่งของนัด (snap) — ถ้าเพื่อนรับต่อเวลาเข้า escrow ก่อนรายการจบงานจะลง
 *  (ยอดในแถวหลังจบ > ยอดที่แบ่ง) ส่วนต่างจะค้างใน escrow → คืนลูกค้าทันทีในรายการ idem เดียว + ปิดคำขอต่อเวลาเป็นไม่สำเร็จ
 *  ลำดับกลับกัน (จบก่อน) ปลอดภัยอยู่แล้ว: respondExtend ย้ายได้เฉพาะสถานะ checked_in */
async function voidLateExtension(r: Booking, snap: Booking, extra: number): Promise<Booking> {
  const back = await moveBooking(r.id, ["completed"], { price_satang: snap.price_satang, total_satang: snap.total_satang, extra_hours: snap.extra_hours ?? 0 },
    { kind: "refund", ref: { type: "booking", id: r.id }, idem: `extend_void:${r.id}`, note: `คืนค่าต่อเวลา ${r.code} · จบนัดก่อนเพื่อนรับต่อเวลา`, actor: "system:extend-race", legs: [
      { owner_type: "platform", owner_id: PLATFORM, bucket: "escrow", amount: -extra },
      { owner_type: "customer", owner_id: r.customer_id, bucket: "available", amount: extra },
    ] });
  if (!back) { console.error("extend void: booking left completed", r.id); return r; }
  await import("./changes").then((m) => m.voidLateExtensions(r.id, extra, "system:extend-race")).catch((e) => console.error("extend void changes", e));
  await addEvent(r.id, "extend_voided", "system", { amount: extra });
  const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });
  await notify({ user_type: "customer", user_id: r.customer_id, kind: "booking_extend", title: `คืนค่าต่อเวลา ${r.code}`, body: `คุณจบนัดก่อนเพื่อนรับต่อเวลา · คืน ${baht(extra)} เข้ากระเป๋าแล้ว`, url: `/order/${r.id}` });
  await notify({ user_type: "parttime", user_id: r.parttime_id, kind: "booking_extend", title: `ต่อเวลา ${r.code} ไม่มีผล`, body: "ลูกค้ายืนยันจบนัดก่อน · คิดส่วนแบ่งตามเวลาเดิม", url: `/join/profile/${r.parttime_mb}/jobs` });
  return back;
}

async function split(live: Booking, actor: string, tip: number, beforeMove?: () => Promise<unknown>): Promise<Booking> {
  const b: Booking = { ...live }; // ภาพนิ่ง — โหมดสาธิตคืนแถวตัวจริง (ห้ามอ่านยอดที่เปลี่ยนระหว่างทาง)
  if (beforeMove) await beforeMove().catch((e) => console.error("split hook", e));
  const cfg = await getEarnings();
  const pct = pctFor(cfg.tiers, (await completedThisMonth(b.parttime_id)) + 1);
  const ptShare = Math.round(b.price_satang * pct / 100);
  const room = await roomLegs(b, b.room_fee_satang ?? 0);
  const run = async (t: number) => {
    const tipPt = Math.round(t * cfg.tipPct / 100);
    const legs: Leg[] = [
      { owner_type: "platform", owner_id: PLATFORM, bucket: "escrow", amount: -b.total_satang },
      { owner_type: "parttime", owner_id: b.parttime_id, bucket: "pending", amount: ptShare + tipPt },
      { owner_type: "platform", owner_id: PLATFORM, bucket: "revenue", amount: b.price_satang - ptShare + (t - tipPt) },
    ];
    legs.push(...room);
    if (t > 0) legs.push({ owner_type: "customer", owner_id: b.customer_id, bucket: "available", amount: -t });
    return moveBooking(b.id, ["accepted", "checked_in"], { status: "completed", completed_at: now(), share_pct: pct, tip_satang: t, pt_pending_satang: ptShare + tipPt },
      { kind: "split", ref: { type: "booking", id: b.id }, idem: `split:${b.id}`, note: `แบ่งเงินนัด ${b.code} · ส่วนแบ่ง ${pct}%${t ? ` · ทิป ฿${t / 100}` : ""}`, actor, legs: legs.filter((l) => l.amount !== 0) });
  };
  let r: Booking | null;
  try { r = await run(tip); }
  catch (e) { if (tip > 0 && e instanceof WalletError) { tip = 0; r = await run(0); } else throw e; }
  if (!r) throw new BookingError("สถานะการจองเปลี่ยนไปแล้ว", "state");
  const lateExtra = (r.total_satang ?? 0) - b.total_satang;
  if (lateExtra > 0) r = await voidLateExtension(r, b, lateExtra);
  await addEvent(b.id, "completed", actor, { pct, tip });
  // แต้มสะสมลูกค้า (ตามระดับเมมเบอร์) — ยอดค่านัด + ทิป · ครั้งเดียวต่อการจอง
  await (await import("@/lib/member")).awardPoints(b.customer_id, b.customer_email ?? "", b.total_satang + tip, `bk:${b.id}`, `นัด ${b.code}`).catch((e) => console.error("points", e));
  const money = await getMoney();
  await notify({ user_type: "parttime", user_id: b.parttime_id, kind: "earning", title: `จบงาน ${b.code}`, body: money.releaseMode === "auto" ? `รายได้รอปล่อย · ถอนได้ใน ${money.releaseHours} ชม.` : "รายได้รอทีมงานตรวจและอนุมัติเข้ากระเป๋า", url: `/join/profile/${b.parttime_mb}/earnings` });
  return r;
}

/** ปล่อยรายได้ของนัดที่จบแล้ว: PT.pending → PT.available (ครั้งเดียวต่อการจอง · กันซ้ำด้วยสถานะ matured_at + idem) */
async function matureOne(b: Booking, actor: string): Promise<Booking> {
  const amt = await ptAmount(b);
  // สายคำเชิญพิเศษ: หักเงินประกันงานเคสละ ฿500 เข้า PT.bond (ครบ 90 วันย้ายเข้ายอดถอนได้ · work-bond.ts)
  const { bondCut } = await import("@/lib/join/work-bond");
  const pt = amt > 0 ? await (await import("@/lib/join/store")).getById(b.parttime_id).catch(() => null) : null;
  const cut = bondCut(!!(pt && (await import("@/lib/join/store")).extraOf(pt).invite), amt);
  return (await moveBooking(b.id, ["completed"], { matured_at: now() }, amt > 0 ? { kind: "mature", ref: { type: "booking", id: b.id }, idem: `mature:${b.id}`, note: `ปล่อยรายได้ ${b.code}${cut ? ` · หักเงินประกันงาน ฿${cut / 100}` : ""}`, actor, legs: ([
    { owner_type: "parttime", owner_id: b.parttime_id, bucket: "pending", amount: -amt },
    { owner_type: "parttime", owner_id: b.parttime_id, bucket: "available", amount: amt - cut },
    { owner_type: "parttime", owner_id: b.parttime_id, bucket: "bond", amount: cut },
  ] as Leg[]).filter((l) => l.amount !== 0) } : null)) ?? b;
}

/** แอดมินอนุมัติรายได้เข้ากระเป๋า (หน้า /admin/payroll) — ทุกนัดที่จบแล้วแต่ยังไม่ปล่อยของ Part-Time คนนี้ (หรือเฉพาะ ids ที่เลือก) */
export async function approveEarnings(parttime_id: string, admin: string, ids?: string[]): Promise<{ count: number; amount: number }> {
  const rows = isDemo ? rawForParttime(parttime_id) : (((await db().from("bookings").select().eq("parttime_id", parttime_id).eq("status", "completed").is("matured_at", null)).data ?? []) as Booking[]);
  let count = 0, amount = 0, mb = "";
  for (const b of rows.filter((x) => x.status === "completed" && !x.matured_at && (!ids || ids.includes(x.id)))) {
    const amt = await ptAmount(b);
    const r = await matureOne(b, `admin:${admin}`);
    if (r.matured_at) { count++; amount += amt; mb = b.parttime_mb; }
  }
  if (count) await notify({ user_type: "parttime", user_id: parttime_id, kind: "earning", title: "รายได้เข้ากระเป๋าแล้ว", body: `อนุมัติ ${count} งาน · ฿${(amount / 100).toLocaleString("th-TH")} · ถอนหรือใช้ได้ทันที`, url: `/join/profile/${mb}/earnings` });
  return { count, amount };
}

/** อ่านแล้วจัดการอัตโนมัติ: Part-Time จบงานแล้วลูกค้าไม่ค้านเกินกำหนด = จบงาน · จบงานครบเวลาปล่อยเงิน = ถอนได้ */
export async function sweepDay(rows: Booking[]): Promise<Booking[]> {
  const m = await getMoney();
  const out: Booking[] = [];
  for (let b of rows) {
    try {
      if ((b.status === "checked_in" || b.status === "accepted") && b.pt_done_at && Date.parse(b.pt_done_at) + m.autoCompleteHours * 3600_000 < Date.now()) b = await split(b, "system:auto-complete", 0);
      if (m.releaseMode === "auto" && b.status === "completed" && !b.matured_at && b.completed_at && Date.parse(b.completed_at) + m.releaseHours * 3600_000 < Date.now()) b = await matureOne(b, "system");
    } catch (e) { console.error("sweepDay", b.id, e); }
    out.push(b);
  }
  return out;
}

// ── วันนัด ──
/** gps = ตำแหน่งตอนกด "ถึงจุดนัด" (ส่งมาจากเครื่อง) · ไม่มี = ใช้จุดล่าสุดจากการแชร์ระหว่างเดินทาง — เก็บเป็นหลักฐานกรณีลูกค้าไม่มา */
export async function checkIn(id: string, parttime_id: string, gps?: { lat?: unknown; lng?: unknown; accuracy?: unknown; error?: unknown }) {
  const b = await getBooking(id);
  if (!b || b.parttime_id !== parttime_id) throw new BookingError("ไม่พบงานนี้", "notfound");
  if (Date.parse(b.starts_at) - Date.now() > 2 * 3600_000) throw new BookingError("เช็กอินได้ก่อนเวลานัดไม่เกิน 2 ชม.");
  const r = await transition(b.id, ["accepted"], { status: "checked_in", checked_in_at: now() });
  if (!r) throw new BookingError("เช็กอินไม่ได้ในสถานะนี้", "state");
  const { inThailand, km } = await import("@/lib/geo");
  let pos: { lat: number; lng: number; accuracy: number | null } | null = null;
  const g = { lat: Number(gps?.lat), lng: Number(gps?.lng) };
  if (inThailand(g)) pos = { ...g, accuracy: Number.isFinite(Number(gps?.accuracy)) ? Math.round(Number(gps?.accuracy)) : null };
  else { const t = await import("./track").then((m) => m.lastTrack(b.id)).catch(() => null); if (t) pos = { lat: t.lat, lng: t.lng, accuracy: t.accuracy }; }
  const pin = { lat: b.place?.lat, lng: b.place?.lng };
  const dist_m = pos && inThailand(pin) ? Math.round(km(pos, pin) * 1000) : null;
  await import("@/lib/arrival").then((m) => m.recordArrival({ booking_id: b.id, provider_id: parttime_id, lat: pos?.lat ?? null, lng: pos?.lng ?? null, accuracy: pos?.accuracy ?? null, gps_error: pos ? null : String(gps?.error ?? "ไม่มี GPS").slice(0, 120) })).catch((e) => console.error("arrival", e));
  await addEvent(b.id, "checked_in", `parttime:${parttime_id}`, pos ? { gps: pos, dist_m } : { gps: null });
  await import("./track").then((m) => m.clearTrack(b.id)).catch(() => {});
  await notify({ user_type: "customer", user_id: b.customer_id, kind: "booking_checked_in", title: `${b.parttime_nick ?? "เพื่อน"} ถึงจุดนัดแล้ว`, body: b.place.detail, url: `/order/${b.id}` });
  await sendMessage(b, "system", null, `${b.parttime_nick ?? "เพื่อน"} ถึงจุดนัดแล้ว · มีเหตุฉุกเฉินกด SOS ได้ตลอด`);
  return r;
}
export async function ptDone(id: string, parttime_id: string) {
  const b = await getBooking(id);
  if (!b || b.parttime_id !== parttime_id) throw new BookingError("ไม่พบงานนี้", "notfound");
  // ต้องเช็กอินแล้ว และถึงเวลานัดแล้ว (กันกดจบงานล่วงหน้าแล้วรอจบอัตโนมัติ)
  if (b.status !== "checked_in") throw new BookingError("เช็กอินที่จุดนัดก่อน จึงจะแจ้งจบงานได้", "state");
  if (Date.parse(b.starts_at) > Date.now()) throw new BookingError("ยังไม่ถึงเวลานัด");
  const r = await transition(b.id, ["checked_in"], { pt_done_at: now() });
  if (!r) throw new BookingError("จบงานไม่ได้ในสถานะนี้", "state");
  const m = await getMoney();
  await addEvent(b.id, "pt_done", `parttime:${parttime_id}`);
  await notify({ user_type: "customer", user_id: b.customer_id, kind: "booking_pt_done", title: "เพื่อนแจ้งจบงานแล้ว", body: `ยืนยันจบงานและรีวิว · ถ้าไม่ตอบใน ${m.autoCompleteHours} ชม. ระบบยืนยันให้อัตโนมัติ`, url: `/order/${b.id}/complete` });
  return r;
}

/** ทิปสูงสุดต่อนัด (บาท) — หน้า "จบนัด" ใช้ค่าเดียวกัน */
export const TIP_MAX = 5000;
/** ลูกค้ายืนยันจบงาน + รีวิว + ทิป (บอร์ด C-Complete) */
/** opts.beforeMove = ทดสอบเท่านั้น (route ส่งเฉพาะโหมดสาธิต): จำลองเพื่อนรับต่อเวลาพร้อมกับที่ลูกค้ากดจบ */
export async function customerComplete(id: string, customer_id: string, rv: { rating: number; tags: string[]; again: string; body: string; tip: number }, opts: { beforeMove?: () => Promise<unknown> } = {}) {
  const b = await getBooking(id);
  if (!b || b.customer_id !== customer_id) throw new BookingError("ไม่พบการจอง", "notfound");
  if (!["accepted", "checked_in"].includes(b.status)) throw new BookingError("ยืนยันจบงานไม่ได้ในสถานะนี้", "state");
  if (Date.parse(b.starts_at) > Date.now()) throw new BookingError("ยังไม่ถึงเวลานัด · กดจบงานได้หลังเริ่มนัด");
  // รีวิวเป็นข้อความสาธารณะ — ห้ามมีช่องทางติดต่อ (กติกาเดียวกับแชท) · ปฏิเสธทั้งคำขอ ไม่จบงานโดยทิ้งรีวิว
  const { hasContact } = await import("@/lib/join/contact-guard");
  if (rv.body && hasContact(rv.body)) throw new BookingError("รีวิวห้ามมีเบอร์โทร LINE ลิงก์ หรือช่องทางติดต่อ · แก้ข้อความแล้วส่งใหม่", "contact");
  // ทิปเป็นบาทเต็ม 0–TIP_MAX (กันพิมพ์ผิดหลักจนตัดเงินก้อนใหญ่)
  const tipBaht = Math.round(Number(rv.tip) || 0);
  if (tipBaht < 0 || tipBaht > TIP_MAX) throw new BookingError(`ทิปได้ 0–${TIP_MAX.toLocaleString()} บาท`, "tip");
  const tip = tipBaht * 100;
  if (tip > 0 && ((await balances("customer", customer_id)).available ?? 0) < tip) throw new BookingError("ยอดในกระเป๋าไม่พอสำหรับทิป");
  const r = await split(b, `customer:${customer_id}`, tip, opts.beforeMove);
  if (rv.rating >= 1 && rv.rating <= 5) await saveReview({ booking_id: b.id, parttime_id: b.parttime_id, customer_id, rating: Math.round(rv.rating), tags: rv.tags.slice(0, 6).map((t) => t.slice(0, 20)), again: rv.again.slice(0, 10) || null, body: rv.body.trim().slice(0, 500) || null, hidden: false, created_at: now() });
  return r;
}
export async function dispute(id: string, customer_id: string, text: string) {
  const b = await getBooking(id);
  if (!b || b.customer_id !== customer_id) throw new BookingError("ไม่พบการจอง", "notfound");
  if (!text.trim()) throw new BookingError("เล่าปัญหาสั้น ๆ ให้ทีมงานทราบ");
  // ก่อนเริ่มนัด (ยังไม่เช็กอิน) = ใช้ "ยกเลิก / เปลี่ยนเวลา" ตามกติกา ไม่ใช่แจ้งปัญหา (กันเลี่ยงกติกายกเลิก)
  if (b.status === "accepted" && Date.parse(b.starts_at) > Date.now()) throw new BookingError("ยังไม่ถึงเวลานัด · ถ้าไม่สะดวกให้กด ยกเลิก / เปลี่ยนเวลา", "state");
  const r = await transition(b.id, ["accepted", "checked_in"], { status: "disputed", resolution: { dispute: text.slice(0, 1000), at: now() } });
  if (!r) throw new BookingError("แจ้งปัญหาไม่ได้ในสถานะนี้ · ติดต่อทีมงานทาง LINE", "state");
  await addEvent(b.id, "disputed", `customer:${customer_id}`, { text });
  await notify({ user_type: "admin", user_id: "ops", kind: "dispute", title: `ลูกค้าแจ้งปัญหา ${b.code}`, body: text.slice(0, 300), url: "/admin/orders" });
  // Part-Time ต้องรู้ว่างานนี้ถูกแจ้งปัญหา (เงินพักไว้จนทีมงานตัดสิน)
  await notify({ user_type: "parttime", user_id: b.parttime_id, kind: "booking_disputed", title: `ลูกค้าแจ้งปัญหา ${b.code}`, body: "ทีมงานกำลังตรวจสอบ · รายได้งานนี้พักไว้จนกว่าจะตัดสิน", url: `/join/profile/${b.parttime_mb}/jobs` });
  return r;
}

/** คำนวณผลตัดสินแบบคืนลูกค้า pct% (ใช้ทั้งตัดสินจริงและให้แอดมินดูก่อนยืนยัน) */
async function refundMath(b: Booking, refundPct: number) {
  const pct = Math.max(0, Math.min(100, Math.round(refundPct)));
  const refund = Math.round(b.total_satang * pct / 100);
  // ส่วนที่ไม่คืน: ค่าห้องตามสัดส่วน → ค้างจ่ายพาร์ทเนอร์ · ค่าบริการ → แบ่ง PT ตามขั้น + รายได้บริษัท
  const roomKeep = Math.round(b.room_fee_satang * (100 - pct) / 100);
  const serviceKeep = b.total_satang - refund - roomKeep;
  const cfg = await getEarnings();
  const sharePct = pctFor(cfg.tiers, (await completedThisMonth(b.parttime_id)) + 1);
  const ptShare = Math.round(serviceKeep * sharePct / 100);
  return { pct, refund, roomKeep, serviceKeep, sharePct, ptShare, revenue: serviceKeep - ptShare };
}
/** แอดมินดูตัวเลขก่อนยืนยันผลตัดสิน */
export async function resolvePreview(id: string, refundPct: number) {
  const b = await getBooking(id);
  if (!b) throw new BookingError("ไม่พบการจอง", "notfound");
  const m = await refundMath(b, refundPct);
  return { total: b.total_satang, refund: m.refund, pt: m.ptShare, share_pct: m.sharePct, room: m.roomKeep, revenue: m.revenue, back_to: b.checked_in_at ? "checked_in" : "accepted" };
}

/** แอดมินตัดสินคำขอยกเลิก/ข้อพิพาท: refundPct = % ยอดรวมที่คืนลูกค้า · ส่วนที่เหลือแบ่งตามปกติ
 *  reject = นัดกลับไปสถานะเดิม (เช็กอินแล้ว = ระหว่างนัด ไม่ให้เช็กอินหาย) */
export async function adminResolve(id: string, admin: string, d: { action: "refund" | "reject"; refundPct: number; note: string }) {
  const b = await getBooking(id);
  if (!b) throw new BookingError("ไม่พบการจอง", "notfound");
  if (!["cancel_requested", "disputed"].includes(b.status)) throw new BookingError("การจองนี้ไม่ได้รอตัดสิน", "state");
  // คำร้องผิดนัดตัดสินที่แท็บ "ผิดนัด" (มีกติกาเงิน + ใบเตือนของมันเอง) — กันตัดสินซ้อนสองทาง
  if (b.status === "disputed" && b.resolution?.noshow && !admin.startsWith("auto:")) throw new BookingError("นัดนี้เป็นคำร้องผิดนัด · ตัดสินที่แท็บ \"ผิดนัด\"", "state");
  const wasCancel = b.status === "cancel_requested";
  const ptUrl = `/join/profile/${b.parttime_mb}/jobs`;
  if (d.action === "reject") {
    const back = b.checked_in_at ? "checked_in" : "accepted";
    const r = await transition(b.id, ["cancel_requested", "disputed"], { status: back, resolution: { ...(b.resolution ?? {}), decided: "reject", note: d.note, by: admin, at: now() } });
    if (!r) throw new BookingError("การจองนี้ถูกตัดสินไปแล้ว", "state");
    await addEvent(b.id, "resolve_reject", admin, { ...d, back });
    await notify({ user_type: "customer", user_id: b.customer_id, kind: "booking_resolved", title: `ผลพิจารณา ${b.code}`, body: d.note || "นัดยังคงอยู่ตามเดิม", url: `/order/${b.id}` });
    await notify({ user_type: "parttime", user_id: b.parttime_id, kind: "booking_resolved", title: `ผลพิจารณา ${b.code}`, body: `${wasCancel ? "ไม่อนุมัติการยกเลิก" : "ยกคำร้องของลูกค้า"} · นัดยังคงอยู่ตามเดิม`, url: ptUrl });
    return r;
  }
  const { pct, refund, roomKeep, serviceKeep, sharePct, ptShare } = await refundMath(b, d.refundPct);
  const legs: Leg[] = [
    { owner_type: "platform", owner_id: PLATFORM, bucket: "escrow", amount: -b.total_satang },
    { owner_type: "customer", owner_id: b.customer_id, bucket: "available", amount: refund },
    { owner_type: "parttime", owner_id: b.parttime_id, bucket: "pending", amount: ptShare },
    { owner_type: "platform", owner_id: PLATFORM, bucket: "revenue", amount: serviceKeep - ptShare },
    ...(await roomLegs(b, roomKeep)),
  ];
  const r = await moveBooking(b.id, ["cancel_requested", "disputed"], {
    status: pct === 100 ? "refunded" : "completed", completed_at: now(), share_pct: pct === 100 ? 0 : sharePct, pt_pending_satang: ptShare,
    // cancelled = มาจากคำขอยกเลิก (สถานะเงินเป็น completed แต่หน้าเว็บต้องแสดงว่า "ยกเลิก" ไม่ใช่ "นัดเสร็จสิ้น")
    resolution: { ...(b.resolution ?? {}), decided: "refund", cancelled: wasCancel, refund_pct: pct, refund_satang: refund, pt_satang: ptShare, room_satang: roomKeep, note: d.note, by: admin, at: now() },
    ...(ptShare ? {} : { matured_at: now() }),
  }, { kind: pct === 100 ? "refund" : "split", ref: { type: "booking", id: b.id }, idem: `resolve:${b.id}`, note: `ผลพิจารณา ${b.code} · คืนลูกค้า ${pct}%`, actor: admin, legs: legs.filter((l) => l.amount !== 0) });
  if (!r) throw new BookingError("การจองนี้ถูกตัดสินไปแล้ว", "state");
  await addEvent(b.id, "resolve_refund", admin, { pct, refund, ptShare });
  const custBody = refund ? `คืนเงิน ${(refund / 100).toLocaleString()} บาทเข้ากระเป๋าแล้ว` : wasCancel ? "ยกเลิก · ไม่คืนเงินตามกติกาการยกเลิก" : d.note;
  await notify({ user_type: "customer", user_id: b.customer_id, kind: "booking_resolved", title: `ผลพิจารณา ${b.code}`, body: custBody, url: `/order/${b.id}` });
  // ยกเลิกอัตโนมัติตามกติกา: cancelByCustomer แจ้ง Part-Time เองแล้ว
  if (!admin.startsWith("auto:")) await notify({ user_type: "parttime", user_id: b.parttime_id, kind: "booking_resolved", title: `ผลพิจารณา ${b.code}`, body: ptShare ? `ลูกค้าได้คืน ${pct}% · คุณได้ส่วนแบ่ง ฿${(ptShare / 100).toLocaleString()} (รอปล่อยเงิน)` : `คืนลูกค้า ${pct}% · งานนี้ไม่มีรายได้`, url: ptUrl });
  return r;
}

/** ตัดสินคำร้องผิดนัด (no-show) — ย้ายเงินจาก escrow ของนัดนี้ (idem เดียวกับ adminResolve = ตัดสินได้ครั้งเดียว)
 *  ลูกค้าไม่มา: เก็บเต็มจำนวน · Part-Time ได้ payoutPct% ของค่าบริการ · ค่าห้องให้สปา · ที่เหลือรายได้บริษัท
 *  Part-Time ไม่มา: คืนลูกค้า 100% */
export async function settleNoShow(id: string, decision: "customer_no_show" | "provider_no_show", admin: string, payoutPct: number) {
  const b = await getBooking(id);
  if (!b) throw new BookingError("ไม่พบการจอง", "notfound");
  const tag = `noshow:${decision}`;
  if (b.resolution?.decided === tag) return b; // ลงเงินไปแล้ว (เรียกซ้ำหลังบันทึกคำร้องไม่สำเร็จ)
  if (b.status !== "disputed") throw new BookingError("การจองนี้ถูกตัดสิน/เปลี่ยนสถานะไปแล้ว", "state");
  const provider = decision === "provider_no_show";
  const ptShare = provider ? 0 : Math.round(b.price_satang * payoutPct / 100);
  const legs: Leg[] = provider ? [
    { owner_type: "platform", owner_id: PLATFORM, bucket: "escrow", amount: -b.total_satang },
    { owner_type: "customer", owner_id: b.customer_id, bucket: "available", amount: b.total_satang },
  ] : [
    { owner_type: "platform", owner_id: PLATFORM, bucket: "escrow", amount: -b.total_satang },
    { owner_type: "parttime", owner_id: b.parttime_id, bucket: "pending", amount: ptShare },
    { owner_type: "platform", owner_id: PLATFORM, bucket: "revenue", amount: b.price_satang - ptShare },
    ...(await roomLegs(b, b.room_fee_satang ?? 0)),
  ];
  const refund = provider ? b.total_satang : 0;
  const r = await moveBooking(b.id, ["disputed"], {
    status: provider ? "refunded" : "completed", completed_at: now(), share_pct: provider ? 0 : payoutPct, pt_pending_satang: ptShare,
    resolution: { ...(b.resolution ?? {}), decided: tag, refund_pct: provider ? 100 : 0, refund_satang: refund, pt_satang: ptShare, room_satang: provider ? 0 : b.room_fee_satang, by: admin, at: now() },
    ...(ptShare ? {} : { matured_at: now() }),
  }, { kind: provider ? "refund" : "split", ref: { type: "booking", id: b.id }, idem: `resolve:${b.id}`, note: `ผิดนัด ${b.code} · ${provider ? "Part-Time ไม่มา คืน 100%" : `ลูกค้าไม่มา · Part-Time ${payoutPct}%`}`, actor: admin, legs: legs.filter((l) => l.amount !== 0) });
  if (!r) throw new BookingError("การจองนี้ถูกตัดสินไปแล้ว", "state");
  await addEvent(b.id, "noshow_decided", admin, { decision, refund, ptShare });
  await notify({ user_type: "customer", user_id: b.customer_id, kind: "noshow_decided", title: `ผลตัดสินผิดนัด ${b.code}`, body: provider ? `เพื่อนไม่มาตามนัด · คืนเงิน ${(refund / 100).toLocaleString()} บาทเข้ากระเป๋าแล้ว` : "ทีมงานตรวจหลักฐานแล้ว: ลูกค้าไม่มาตามนัด · ไม่คืนเงินตามกติกา", url: `/order/${b.id}` });
  await notify({ user_type: "parttime", user_id: b.parttime_id, kind: "noshow_decided", title: `ผลตัดสินผิดนัด ${b.code}`, body: provider ? "ทีมงานตัดสิน: คุณไม่มาตามนัด · คืนเงินลูกค้า + ใบเตือน 1 ครั้ง" : `ลูกค้าไม่มาตามนัด · คุณได้ ฿${(ptShare / 100).toLocaleString()} (${payoutPct}% รอปล่อยเงิน)`, url: `/join/profile/${b.parttime_mb}/jobs` });
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

/** คะแนนเฉลี่ย + จำนวนรีวิว (ไม่รวมที่ซ่อน) ของ Part-Time หลายคนในครั้งเดียว — ใช้กับการ์ดหน้าแรก/ค้นหา/จอง */
export async function ratingSummary(ids: string[]): Promise<Map<string, { avg: number; count: number }>> {
  const out = new Map<string, { avg: number; count: number }>();
  if (!ids.length) return out;
  const rows: { parttime_id: string; rating: number }[] = isDemo
    ? demo.reviews.filter((r) => ids.includes(r.parttime_id) && !r.hidden)
    : (((await db().from("reviews").select("parttime_id, rating").in("parttime_id", ids).eq("hidden", false)).data ?? []) as { parttime_id: string; rating: number }[]);
  for (const r of rows) { const x = out.get(r.parttime_id) ?? { avg: 0, count: 0 }; x.avg = (x.avg * x.count + r.rating) / (x.count + 1); x.count++; out.set(r.parttime_id, x); }
  return out;
}

// ── ถอนเงิน (Part-Time) ──
export async function ptWallet(parttime_id: string) {
  const [b, h] = await Promise.all([balances("parttime", parttime_id), history("parttime", parttime_id, 50)]);
  return { pending: b.pending ?? 0, available: b.available ?? 0, withdrawing: b.withdrawing ?? 0, bond: b.bond ?? 0, history: h };
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
  // แถวคำขอก่อน → ย้ายเงิน available → withdrawing แบบมีเงื่อนไข (ยอดไม่พอ = ลบแถวทิ้ง ไม่มีเงินค้างไร้เจ้าของ)
  const demoRow: Withdrawal = { ...row, id, created_at: now(), paid_at: null };
  if (isDemo) demo.withdrawals.unshift(demoRow);
  else {
    const { error } = await db().from("withdrawals").insert({ ...row, id });
    if (error?.code === "23505") throw new BookingError("มีคำขอถอนที่รอโอนอยู่แล้ว · รอรอบโอนถัดไป");
    if (error) throw error;
  }
  const drop = async () => { if (isDemo) demo.withdrawals.splice(demo.withdrawals.indexOf(demoRow), 1); else await db().from("withdrawals").delete().eq("id", id).eq("status", "requested"); };
  try {
    const w = await move<Withdrawal>({ table: "withdrawals", id, from: ["requested"], patch: { status: "requested" }, demoRow: () => demo.withdrawals.find((x) => x.id === id) },
      { kind: "withdraw_req", ref: { type: "withdrawal", id }, idem: `wreq:${id}`, note: `ขอถอน ฿${amountBaht.toLocaleString()}`, actor: `parttime:${a.id}`, legs: [
        { owner_type: "parttime", owner_id: a.id, bucket: "available", amount: -amount },
        { owner_type: "parttime", owner_id: a.id, bucket: "withdrawing", amount },
      ] });
    if (!w) throw new BookingError("สร้างคำขอถอนไม่สำเร็จ");
    await notify({ user_type: "admin", user_id: "ceo", kind: "withdraw_req", title: `คำขอถอน ${a.mb_code} ฿${amountBaht.toLocaleString()} · รอ CEO อนุมัติ`, body: `สุทธิ ฿${(w.net_satang / 100).toLocaleString()} · ${a.bank}`, url: "/admin/payroll" });
    return w;
  } catch (e) {
    await drop().catch(() => {});
    if (e instanceof WalletError) throw new BookingError("ยอดถอนได้ไม่พอ");
    throw e;
  }
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
/** CEO อนุมัติคำขอถอน (ชั้นที่ 2) → ส่งต่อหน้าแอดมิน "โอนให้ Part-Time" · ยังไม่ย้ายเงิน (เงินอยู่ใน withdrawing ตั้งแต่ตอนขอ) */
export async function approveWithdrawal(id: string, ceo: string) {
  const r = await patchW(id, ["requested"], { status: "approved", approved_by: ceo, approved_at: now() });
  if (!r) throw new BookingError("คำขอนี้ไม่ได้รออนุมัติ", "state");
  await notify({ user_type: "parttime", user_id: r.parttime_id, kind: "withdraw_req", title: "อนุมัติคำขอถอนแล้ว", body: `฿${(r.net_satang / 100).toLocaleString()} · รอทีมงานโอนเข้าบัญชี ${r.bank.bank}`, url: `/join/profile/${r.parttime_mb}/withdraw` });
  await notify({ user_type: "admin", user_id: "finance", kind: "withdraw_req", title: `CEO อนุมัติถอน ${r.parttime_mb} · รอโอน`, body: `สุทธิ ฿${(r.net_satang / 100).toLocaleString()} · ${r.bank.bank}`, url: "/admin/payouts" });
  return r;
}
/** CEO ไม่อนุมัติ → คืนยอดเข้าถอนได้ */
export async function rejectWithdrawal(id: string, ceo: string, note: string) {
  const w = await getWithdrawal(id);
  if (!w || w.status !== "requested") throw new BookingError("คำขอนี้ไม่ได้รออนุมัติ", "state");
  return markFailed(id, ceo, note || "CEO ไม่อนุมัติ");
}

/** สร้างรอบโอน: คำขอที่ CEO อนุมัติแล้วทั้งหมด → batched + คืนข้อมูลสำหรับไฟล์โอนกลุ่ม */
export async function makeBatch(admin: string) {
  const reqs = await listWithdrawals({ status: "approved" });
  const batch = `B${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const done: Withdrawal[] = [];
  for (const w of reqs) { const r = await patchW(w.id, ["approved"], { status: "batched", batch_id: batch, note: `by ${admin}` }); if (r) done.push(r); }
  return { batch, rows: done };
}
export async function getWithdrawal(id: string): Promise<Withdrawal | null> {
  if (isDemo) return demo.withdrawals.find((x) => x.id === id) ?? null;
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await db().from("withdrawals").select().eq("id", id).maybeSingle();
  return (data as Withdrawal) ?? null;
}
/** ปิดคำขอถอน (โอนแล้ว/โอนไม่สำเร็จ) — เปลี่ยนสถานะ + ลงเงินพร้อมกัน · idem เดียวกันทั้ง 2 ทาง กันกดทั้งโอนแล้วและไม่สำเร็จ */
async function settle(id: string, admin: string, paid: boolean, note = "") {
  const w = await getWithdrawal(id);
  const from: Withdrawal["status"][] = paid ? ["approved", "batched"] : ["requested", "approved", "batched"];
  if (!w || !from.includes(w.status)) throw new BookingError(paid && w?.status === "requested" ? "รอ CEO อนุมัติก่อนโอน" : "คำขอนี้ไม่ได้รอโอน", "state");
  const legs: Leg[] = paid ? [
    { owner_type: "parttime", owner_id: w.parttime_id, bucket: "withdrawing", amount: -w.amount_satang },
    { owner_type: "platform", owner_id: PLATFORM, bucket: "bank", amount: w.net_satang },
    { owner_type: "platform", owner_id: PLATFORM, bucket: "revenue", amount: w.fee_satang },
    { owner_type: "platform", owner_id: PLATFORM, bucket: "wht_payable", amount: w.wht_satang },
  ] : [
    { owner_type: "parttime", owner_id: w.parttime_id, bucket: "withdrawing", amount: -w.amount_satang },
    { owner_type: "parttime", owner_id: w.parttime_id, bucket: "available", amount: w.amount_satang },
  ];
  const r = await move<Withdrawal>({ table: "withdrawals", id, from, patch: paid ? { status: "paid", paid_at: now() } : { status: "failed", note: note.slice(0, 200) }, demoRow: () => demo.withdrawals.find((x) => x.id === id) },
    { kind: paid ? "withdraw_paid" : "withdraw_fail", ref: { type: "withdrawal", id }, idem: `wsettle:${id}`, note: paid ? `โอนแล้ว ฿${(w.net_satang / 100).toLocaleString()}` : `โอนไม่สำเร็จ · ${note}`, actor: admin, legs: legs.filter((l) => l.amount !== 0) });
  if (!r) throw new BookingError("คำขอนี้ถูกปิดไปแล้ว", "state");
  return { w, r };
}
export async function markPaid(id: string, admin: string) {
  const { w, r } = await settle(id, admin, true);
  await notify({ user_type: "parttime", user_id: w.parttime_id, kind: "withdraw_paid", title: "โอนเงินแล้ว", body: `฿${(w.net_satang / 100).toLocaleString()} เข้าบัญชี ${w.bank.bank}`, url: `/join/profile/${w.parttime_mb}/earnings` });
  return r;
}
export async function markFailed(id: string, admin: string, note: string) {
  const { w, r } = await settle(id, admin, false, note);
  await notify({ user_type: "parttime", user_id: w.parttime_id, kind: "withdraw_failed", title: "โอนเงินไม่สำเร็จ", body: `คืนยอดเข้าถอนได้แล้ว · ${note}`.slice(0, 200), url: `/join/profile/${w.parttime_mb}/withdraw` });
  return r;
}
