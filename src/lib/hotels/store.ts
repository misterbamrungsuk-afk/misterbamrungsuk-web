import "server-only";
import { PLATFORM, WalletError, balances, move, type Leg, type MoveTable, type MoveTx } from "@/lib/wallet";
import { db, getPartner, isDemo, type Partner } from "@/lib/partner/store";
import { getListing } from "@/lib/partner/portal";
import { isPublicPartner, venueKind } from "@/lib/partner/kind";
import {
  CONFIRM_HOURS, HOLDING, MAX_AHEAD_DAYS, MAX_NIGHTS, MAX_ROOMS_PER_BOOKING, addDays, bahtTxt, bkkToday, cancelRule, checkinAt, checkoutAt,
  isDate, nightsBetween, nightsOf, staySplit, thDate, type RoomType, type StayBooking, type StayStatus,
} from "./types";

// ห้องพักโรงแรมพาร์ทเนอร์ (supabase/partner/0007_hotel_rooms.sql) — Supabase service role หรือโหมดเดโมในหน่วยความจำ
// เงินทุกขั้นผ่าน move() ของ lib/wallet (เปลี่ยนสถานะ + ลงเงินพร้อมกัน · idem กันซ้ำ):
//  จอง:   customer.available → platform.hotel_escrow
//  คืน:   platform.hotel_escrow → customer.available (ปฏิเสธ / หมดเวลายืนยัน / ยกเลิกฟรี / ทีมงานคืน)
//  จบ:    platform.hotel_escrow → partner.available (ยอด − %) + platform.revenue (%) (หลังเช็กเอาต์ หรือยกเลิกช้า = ไม่คืนเงิน)
// แยก bucket hotel_escrow จาก escrow ของนัดเพื่อน เพื่อไม่ให้รายงานกระทบยอดการจอง (wallet_recon) เพี้ยน

const TABLE: MoveTable = "hotel_bookings"; // wallet_move ต้องรู้จักตารางนี้ (0007_hotel_rooms.sql)
const ESCROW = "hotel_escrow";
const now = () => new Date().toISOString();
export class StayError extends Error { constructor(msg: string, public code = "bad", public status = 400) { super(msg); } }

type Demo = { types: RoomType[]; bookings: StayBooking[] };
const g = globalThis as unknown as { __mbHotels?: Demo };
const demo: Demo = (g.__mbHotels ??= { types: [], bookings: [] });

/** พาร์ทเนอร์นี้เป็นโรงแรมไหม (ประเภทตอนสมัคร หรือประเภทหน้าร้าน) */
export async function isHotelPartner(p: Pick<Partner, "id" | "type">): Promise<boolean> {
  if (venueKind(p.type) === "โรงแรม") return true;
  if (venueKind(p.type)) return false;
  const l = await getListing(p.id).catch(() => null);
  return venueKind(l?.type) === "โรงแรม";
}

// ── ประเภทห้อง ──
export async function listRoomTypes(pid: string, activeOnly = false): Promise<RoomType[]> {
  if (isDemo) return demo.types.filter((t) => t.partner_id === pid && (!activeOnly || t.active)).sort((a, b) => a.sort - b.sort);
  let q = db().from("partner_room_types").select("*").eq("partner_id", pid).order("sort", { ascending: true });
  if (activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RoomType[];
}
export async function getRoomType(id: string): Promise<RoomType | null> {
  if (isDemo) return demo.types.find((t) => t.id === id) ?? null;
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data, error } = await db().from("partner_room_types").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as RoomType) ?? null;
}

export type RoomTypeInput = { id?: string; name: string; price_satang: number; capacity: number; rooms: number; photos: string[]; description: string | null };
/** บันทึกทั้งชุด: มี id เดิม = แก้ · ไม่มี = เพิ่ม · ที่ไม่ได้ส่งมา = ปิดขาย (ไม่ลบ เพราะมีการจองอ้างอิง) */
export async function saveRoomTypes(pid: string, items: RoomTypeInput[]): Promise<RoomType[]> {
  const old = await listRoomTypes(pid);
  const mine = new Map(old.map((t) => [t.id, t]));
  const t = now();
  const rows: RoomType[] = items.map((x, i) => {
    const was = x.id ? mine.get(x.id) : undefined;
    return { id: was?.id ?? crypto.randomUUID(), partner_id: pid, name: x.name, price_satang: x.price_satang, capacity: x.capacity, rooms: x.rooms, photos: x.photos, description: x.description, active: true, sort: i, created_at: was?.created_at ?? t, updated_at: t };
  });
  const keep = new Set(rows.map((r) => r.id));
  if (isDemo) {
    for (const o of demo.types) if (o.partner_id === pid && !keep.has(o.id)) Object.assign(o, { active: false, updated_at: t });
    for (const r of rows) { const i = demo.types.findIndex((x) => x.id === r.id); if (i >= 0) demo.types[i] = r; else demo.types.push(r); }
    return listRoomTypes(pid);
  }
  if (rows.length) {
    const { error } = await db().from("partner_room_types").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }
  let off = db().from("partner_room_types").update({ active: false, updated_at: t }).eq("partner_id", pid).eq("active", true);
  if (keep.size) off = off.not("id", "in", `(${[...keep].join(",")})`);
  const { error } = await off;
  if (error) throw error;
  return listRoomTypes(pid);
}

// ── ห้องว่าง ──
async function holdingFor(typeIds: string[], from: string, to: string): Promise<StayBooking[]> {
  if (!typeIds.length) return [];
  if (isDemo) return demo.bookings.filter((b) => typeIds.includes(b.room_type_id) && HOLDING.includes(b.status) && b.check_in < to && b.check_out > from);
  const { data, error } = await db().from("hotel_bookings").select("*").in("room_type_id", typeIds).in("status", HOLDING).lt("check_in", to).gt("check_out", from).limit(2000);
  if (error) throw error;
  return (data ?? []) as StayBooking[];
}
/** ห้องว่างน้อยสุดตลอดช่วงที่พัก (นับทุกคืน) */
function leftOf(t: RoomType, held: StayBooking[], from: string, to: string) {
  let left = t.rooms;
  for (const d of nightsOf(from, to)) {
    const used = held.filter((b) => b.room_type_id === t.id && b.check_in <= d && b.check_out > d).reduce((s, b) => s + b.rooms, 0);
    left = Math.min(left, t.rooms - used);
  }
  return Math.max(0, left);
}

/** ตรวจช่วงวันที่: ไม่ย้อนหลัง · อย่างน้อย 1 คืน · ไม่เกิน 14 คืน · ล่วงหน้าไม่เกิน 180 วัน (วันที่ไทย) */
export function checkRange(check_in: unknown, check_out: unknown): { check_in: string; check_out: string; nights: number } {
  if (!isDate(check_in) || !isDate(check_out)) throw new StayError("เลือกวันเช็กอินและเช็กเอาต์");
  const today = bkkToday();
  if (check_in < today) throw new StayError("วันเช็กอินต้องไม่ใช่วันที่ผ่านมาแล้ว");
  if (check_in > addDays(today, MAX_AHEAD_DAYS)) throw new StayError(`จองล่วงหน้าได้ไม่เกิน ${MAX_AHEAD_DAYS} วัน`);
  const nights = nightsBetween(check_in, check_out);
  if (nights < 1) throw new StayError("เช็กเอาต์ต้องหลังเช็กอินอย่างน้อย 1 คืน");
  if (nights > MAX_NIGHTS) throw new StayError(`จองได้ครั้งละไม่เกิน ${MAX_NIGHTS} คืน`);
  return { check_in, check_out, nights };
}

export type Avail = { id: string; name: string; price_satang: number; capacity: number; rooms: number; photos: string[]; description: string | null; left: number };
export async function availability(pid: string, check_in: string, check_out: string): Promise<Avail[]> {
  const types = await listRoomTypes(pid, true);
  const held = await holdingFor(types.map((t) => t.id), check_in, check_out);
  return types.map((t) => ({ id: t.id, name: t.name, price_satang: t.price_satang, capacity: t.capacity, rooms: t.rooms, photos: t.photos, description: t.description, left: leftOf(t, held, check_in, check_out) }));
}

// ── การจอง ──
const code = () => "HT-" + crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
const escrowIn = (b: StayBooking): Leg[] => [
  { owner_type: "customer", owner_id: b.customer_id, bucket: "available", amount: -b.total_satang },
  { owner_type: "platform", owner_id: PLATFORM, bucket: ESCROW, amount: b.total_satang },
];
const refundLegs = (b: StayBooking): Leg[] => [
  { owner_type: "platform", owner_id: PLATFORM, bucket: ESCROW, amount: -b.total_satang },
  { owner_type: "customer", owner_id: b.customer_id, bucket: "available", amount: b.total_satang },
];
function settleLegs(b: StayBooking): { legs: Leg[]; fee: number; net: number } {
  const { fee, net } = staySplit(b.total_satang, b.platform_pct);
  const legs: Leg[] = [
    { owner_type: "platform", owner_id: PLATFORM, bucket: ESCROW, amount: -b.total_satang },
    { owner_type: "partner", owner_id: b.partner_id, bucket: "available", amount: net },
    { owner_type: "platform", owner_id: PLATFORM, bucket: "revenue", amount: fee },
  ];
  return { legs: legs.filter((l) => l.amount !== 0), fee, net };
}

async function moveStay(id: string, from: StayStatus[], patch: Partial<StayBooking>, tx: MoveTx | null): Promise<StayBooking | null> {
  return move<StayBooking>({ table: TABLE, id, from, patch: { ...patch, updated_at: now() } as Record<string, unknown>, demoRow: () => demo.bookings.find((x) => x.id === id) }, tx);
}
/** เปลี่ยนสถานะที่ไม่มีเงินเคลื่อน (paying → void) */
async function plainUpdate(id: string, from: StayStatus[], patch: Partial<StayBooking>) {
  if (isDemo) { const b = demo.bookings.find((x) => x.id === id); if (b && from.includes(b.status)) Object.assign(b, patch, { updated_at: now() }); return; }
  await db().from("hotel_bookings").update({ ...patch, updated_at: now() }).eq("id", id).in("status", from);
}

export type CreateInput = { hotel_id: unknown; room_type_id: unknown; check_in: unknown; check_out: unknown; rooms: unknown; guests: unknown; guest_name: unknown; note: unknown };
export async function createStay(me: { sub: string; email: string | null }, x: CreateInput): Promise<StayBooking> {
  const pid = String(x.hotel_id ?? "");
  const p = await getPartner(pid).catch(() => null);
  if (!p || !isPublicPartner(p) || !(await isHotelPartner(p))) throw new StayError("ไม่พบโรงแรมนี้ หรือยังไม่เปิดรับจอง", "hotel", 404);
  const t = await getRoomType(String(x.room_type_id ?? ""));
  if (!t || t.partner_id !== pid || !t.active) throw new StayError("เลือกประเภทห้องก่อน", "room");
  const r = checkRange(x.check_in, x.check_out);
  const rooms = Math.round(Number(x.rooms));
  if (!(rooms >= 1 && rooms <= Math.min(MAX_ROOMS_PER_BOOKING, t.rooms))) throw new StayError(`จำนวนห้องต้องอยู่ระหว่าง 1–${Math.min(MAX_ROOMS_PER_BOOKING, t.rooms)}`);
  const guests = Math.round(Number(x.guests));
  if (!(guests >= 1 && guests <= t.capacity * rooms)) throw new StayError(`ห้องนี้พักได้ไม่เกิน ${t.capacity} คนต่อห้อง (รวม ${t.capacity * rooms} คน)`);
  const guest_name = String(x.guest_name ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  if (guest_name.length < 2) throw new StayError("กรอกชื่อผู้เข้าพัก");
  const note = String(x.note ?? "").trim().slice(0, 300) || null;
  const total = t.price_satang * r.nights * rooms;
  if (!(total > 0)) throw new StayError("ห้องนี้ยังไม่ได้ตั้งราคา");
  const created = Date.now();
  const expires = Math.max(created + 30 * 60_000, Math.min(created + CONFIRM_HOURS * 3600_000, checkinAt(r.check_in)));
  const pct = Math.max(0, Math.min(100, Number(p.platform_pct ?? 0) || 0));
  const row: StayBooking = {
    id: crypto.randomUUID(), code: code(), partner_id: pid, partner_name: p.business_name, room_type_id: t.id, room_name: t.name,
    customer_id: me.sub, customer_email: me.email, guest_name, guests, rooms, check_in: r.check_in, check_out: r.check_out, nights: r.nights,
    price_satang: t.price_satang, total_satang: total, platform_pct: pct, status: "paying", note, expires_at: new Date(expires).toISOString(), decline_reason: null,
    refund_satang: null, partner_net_satang: null, platform_fee_satang: null, confirmed_at: null, declined_at: null, cancelled_at: null, completed_at: null, refunded_at: null,
    created_at: new Date(created).toISOString(), updated_at: new Date(created).toISOString(),
  };
  const full = () => new StayError("ห้องประเภทนี้ว่างไม่พอในช่วงวันที่เลือก ลองเปลี่ยนวันหรือประเภทห้อง", "full", 409);
  if (isDemo) {
    // ตรวจห้องว่าง + กันห้องในจังหวะเดียว (ไม่มี await คั่น) — กันกดพร้อมกันแล้วห้องเกิน
    const held = demo.bookings.filter((b) => b.room_type_id === t.id && HOLDING.includes(b.status) && b.check_in < r.check_out && b.check_out > r.check_in);
    if (leftOf(t, held, r.check_in, r.check_out) < rooms) throw full();
    demo.bookings.unshift(row);
  } else {
    const held = await holdingFor([t.id], r.check_in, r.check_out);
    if (leftOf(t, held, r.check_in, r.check_out) < rooms) throw full();
    // trigger hotel_bookings_capacity (0007) ล็อกแถวประเภทห้อง แล้วนับซ้ำ — กันจองพร้อมกันเกินจำนวนห้อง
    const { error } = await db().from("hotel_bookings").insert(row);
    if (error) { if (/hotel overbook/.test(error.message)) throw full(); throw error; }
  }
  let paid: StayBooking | null;
  try {
    paid = await moveStay(row.id, ["paying"], { status: "pending" }, {
      kind: "hold", ref: { type: "stay", id: row.id }, idem: `stay:hold:${row.id}`, note: `จองห้องพัก ${row.code} · ${p.business_name}`, actor: `customer:${me.sub}`, legs: escrowIn(row),
    });
  } catch (e) {
    await plainUpdate(row.id, ["paying"], { status: "void" }).catch(() => null);
    if (e instanceof WalletError) throw new StayError("ยอดเงินในกระเป๋าไม่พอ", "funds", 402);
    throw e;
  }
  if (!paid) throw new StayError("ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง", "state", 409);
  await tellCustomer(paid, "stay_booked", `ส่งคำขอจองห้อง ${paid.code} แล้ว`, `${p.business_name} · ${thDate(paid.check_in)} · ${paid.nights} คืน · รอโรงแรมยืนยัน (ไม่ตอบภายในเวลา = คืนเงินเต็ม)`);
  await tellPartner(p, `มีการจองห้องใหม่ ${paid.code}`, `${paid.room_name} ×${paid.rooms} · ${thDate(paid.check_in)} – ${thDate(paid.check_out)} · ${bahtTxt(paid.total_satang)} · กรุณายืนยันภายใน ${CONFIRM_HOURS} ชม.`);
  return paid;
}

// ── อ่าน ──
export async function getStay(id: string): Promise<StayBooking | null> {
  if (isDemo) return demo.bookings.find((b) => b.id === id) ?? null;
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data, error } = await db().from("hotel_bookings").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as StayBooking) ?? null;
}
export async function listStays(f: { customer?: string; partner?: string; limit?: number } = {}): Promise<StayBooking[]> {
  await sweep().catch((e) => console.error("stay sweep", e));
  const limit = f.limit ?? 300;
  if (isDemo) return demo.bookings.filter((b) => b.status !== "paying" && (!f.customer || b.customer_id === f.customer) && (!f.partner || b.partner_id === f.partner)).slice(0, limit);
  let q = db().from("hotel_bookings").select("*").neq("status", "paying").order("created_at", { ascending: false }).limit(limit);
  if (f.customer) q = q.eq("customer_id", f.customer);
  if (f.partner) q = q.eq("partner_id", f.partner);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as StayBooking[];
}

// ── เปลี่ยนสถานะ ──
async function refund(b: StayBooking, from: StayStatus[], status: StayStatus, extra: Partial<StayBooking>, actor: string, why: string) {
  return moveStay(b.id, from, { status, refund_satang: b.total_satang, ...extra }, {
    kind: "refund", ref: { type: "stay", id: b.id }, idem: `stay:refund:${b.id}`, note: `คืนเงินจองห้อง ${b.code} · ${why}`, actor, legs: refundLegs(b),
  });
}
async function settle(b: StayBooking, from: StayStatus[], status: StayStatus, extra: Partial<StayBooking>, actor: string, why: string) {
  const s = settleLegs(b);
  return moveStay(b.id, from, { status, partner_net_satang: s.net, platform_fee_satang: s.fee, ...extra }, {
    kind: "split", ref: { type: "stay", id: b.id }, idem: `stay:settle:${b.id}`, note: `ค่าห้องพัก ${b.code} · ${why} · แพลตฟอร์ม ${b.platform_pct}%`, actor, legs: s.legs,
  });
}

/** โรงแรมยืนยัน / ปฏิเสธ (ปฏิเสธ = คืนเงินเต็ม) — เฉพาะรายการของตัวเองที่ยังรอยืนยัน */
export async function partnerAct(pid: string, id: string, action: "confirm" | "decline", reason: string): Promise<StayBooking> {
  await sweep().catch(() => null);
  const b = await getStay(id);
  if (!b || b.partner_id !== pid) throw new StayError("ไม่พบรายการ", "nf", 404);
  if (b.status !== "pending") throw new StayError("รายการนี้เปลี่ยนสถานะไปแล้ว", "state", 409);
  const t = now();
  const r = action === "confirm"
    ? await moveStay(b.id, ["pending"], { status: "confirmed", confirmed_at: t }, null)
    : await refund(b, ["pending"], "declined", { declined_at: t, decline_reason: reason || "ห้องไม่ว่าง" }, `partner:${pid}`, "โรงแรมปฏิเสธ");
  if (!r) throw new StayError("รายการนี้เปลี่ยนสถานะไปแล้ว", "state", 409);
  if (action === "confirm") await tellCustomer(r, "stay_confirmed", `โรงแรมยืนยันการจอง ${r.code} แล้ว`, `${r.partner_name} · เช็กอิน ${thDate(r.check_in)} ตั้งแต่ 14:00`);
  else await tellCustomer(r, "stay_declined", `โรงแรมปฏิเสธการจอง ${r.code}`, `${r.decline_reason ?? ""} · คืนเงิน ${bahtTxt(r.total_satang)} เข้ากระเป๋าแล้ว`);
  return r;
}

/** ลูกค้ายกเลิก: รอยืนยัน / ก่อนเช็กอิน 24 ชม. = คืนเต็ม · หลังจากนั้นถึงเวลาเช็กอิน = ไม่คืนเงิน (โรงแรมได้ค่าห้อง) */
export async function customerCancel(customer: string, id: string, expectRefund?: boolean): Promise<StayBooking> {
  await sweep().catch(() => null);
  const b = await getStay(id);
  if (!b || b.customer_id !== customer) throw new StayError("ไม่พบรายการ", "nf", 404);
  const rule = cancelRule(b);
  if (!rule.can) throw new StayError("รายการนี้ยกเลิกไม่ได้แล้ว", "state", 409);
  // ลูกค้ากดยืนยันตอนยังคืนเงินได้ แต่เลยเวลาไประหว่างนั้น → ให้ดูกติกาใหม่ก่อน
  if (expectRefund === true && !rule.refund) throw new StayError("เลยเวลายกเลิกฟรีแล้ว · ยกเลิกตอนนี้จะไม่ได้รับเงินคืน", "late", 409);
  const t = now();
  const from: StayStatus[] = [b.status];
  const r = rule.refund
    ? await refund(b, from, "cancelled", { cancelled_at: t }, `customer:${customer}`, "ลูกค้ายกเลิก (คืนเต็ม)")
    : await settle(b, from, "cancelled", { cancelled_at: t, refund_satang: 0 }, `customer:${customer}`, "ลูกค้ายกเลิกหลังกำหนด (ไม่คืนเงิน)");
  if (!r) throw new StayError("รายการนี้เปลี่ยนสถานะไปแล้ว", "state", 409);
  await tellCustomer(r, "stay_cancelled", `ยกเลิกการจอง ${r.code} แล้ว`, rule.refund ? `คืนเงิน ${bahtTxt(r.total_satang)} เข้ากระเป๋าแล้ว` : "ยกเลิกหลังกำหนดยกเลิกฟรี · ไม่คืนเงินตามกติกา");
  const p = await getPartner(r.partner_id).catch(() => null);
  if (p) await tellPartner(p, `ลูกค้ายกเลิกการจอง ${r.code}`, rule.refund ? "ยกเลิกในกำหนด · คืนเงินลูกค้าเต็มจำนวน · ห้องกลับมาว่าง" : `ยกเลิกหลังกำหนด · ค่าห้อง ${bahtTxt(r.partner_net_satang ?? 0)} (หัก % แพลตฟอร์มแล้ว) เข้ากระเป๋าร้าน`);
  return r;
}

/** ทีมงานคืนเงินเต็ม (เฉพาะรายการที่เงินยังพักอยู่: รอยืนยัน / ยืนยันแล้ว) */
export async function adminRefund(id: string, actor: string, note: string): Promise<StayBooking> {
  const b = await getStay(id);
  if (!b) throw new StayError("ไม่พบรายการ", "nf", 404);
  if (b.status !== "pending" && b.status !== "confirmed") throw new StayError("คืนเงินได้เฉพาะรายการที่รอยืนยันหรือยืนยันแล้ว (เงินยังพักอยู่)", "state", 409);
  const r = await refund(b, ["pending", "confirmed"], "refunded", { refunded_at: now(), decline_reason: note }, actor, note);
  if (!r) throw new StayError("รายการนี้เปลี่ยนสถานะไปแล้ว", "state", 409);
  await tellCustomer(r, "stay_refunded", `คืนเงินการจอง ${r.code}`, `ทีมงานคืน ${bahtTxt(r.total_satang)} เข้ากระเป๋าแล้ว · ${note}`);
  const p = await getPartner(r.partner_id).catch(() => null);
  if (p) await tellPartner(p, `ทีมงานยกเลิกการจอง ${r.code}`, `คืนเงินลูกค้าแล้ว · ${note}`);
  return r;
}

/** กวาดสถานะตามเวลา (เรียกตอนอ่านรายการ): รอยืนยันเกินเวลา → คืนเงิน · ยืนยันแล้วและเลยเวลาเช็กเอาต์ → แบ่งเงินเข้าโรงแรม · ค้าง "กำลังชำระ" → void */
export async function sweep(): Promise<number> {
  const nowMs = Date.now();
  let rows: StayBooking[];
  if (isDemo) rows = demo.bookings.filter((b) => b.status === "pending" || b.status === "confirmed" || b.status === "paying");
  else {
    const [a, c, y] = await Promise.all([
      db().from("hotel_bookings").select("*").eq("status", "pending").lt("expires_at", new Date(nowMs).toISOString()).limit(200),
      db().from("hotel_bookings").select("*").eq("status", "confirmed").lte("check_out", bkkToday(nowMs)).limit(200),
      db().from("hotel_bookings").select("*").eq("status", "paying").lt("created_at", new Date(nowMs - 15 * 60_000).toISOString()).limit(200),
    ]);
    for (const r of [a, c, y]) if (r.error) throw r.error;
    rows = [...(a.data ?? []), ...(c.data ?? []), ...(y.data ?? [])] as StayBooking[];
  }
  let n = 0;
  for (const b of rows) {
    try {
      if (b.status === "paying" && Date.parse(b.created_at) < nowMs - 15 * 60_000) { await plainUpdate(b.id, ["paying"], { status: "void" }); n++; }
      else if (b.status === "pending" && Date.parse(b.expires_at) <= nowMs) {
        const r = await refund(b, ["pending"], "expired", { declined_at: now(), decline_reason: "โรงแรมไม่ได้ยืนยันภายในเวลา" }, "auto:stay", "หมดเวลายืนยัน");
        if (r) { n++; await tellCustomer(r, "stay_expired", `การจอง ${r.code} หมดเวลา`, `โรงแรมไม่ได้ยืนยันภายในเวลา · คืนเงิน ${bahtTxt(r.total_satang)} เข้ากระเป๋าแล้ว`); }
      } else if (b.status === "confirmed" && nowMs >= checkoutAt(b.check_out)) {
        const r = await settle(b, ["confirmed"], "completed", { completed_at: now() }, "auto:stay", "เช็กเอาต์แล้ว");
        if (r) {
          n++;
          await tellCustomer(r, "stay_completed", `ขอบคุณที่เข้าพัก ${r.partner_name}`, `การจอง ${r.code} เสร็จสมบูรณ์`);
          const p = await getPartner(r.partner_id).catch(() => null);
          if (p) await tellPartner(p, `ค่าห้อง ${r.code} เข้ากระเป๋าแล้ว`, `${bahtTxt(r.partner_net_satang ?? 0)} (หักแพลตฟอร์ม ${r.platform_pct}%)`);
        }
      }
    } catch (e) { console.error("stay sweep row", b.code, e); }
  }
  return n;
}

/** ยอดเงินพักของห้องพัก (หลังบ้าน) — ต้องเท่ากับยอดรวมรายการที่รอยืนยัน/ยืนยันแล้ว */
export async function stayRecon(): Promise<{ escrow: number; expected: number; ok: boolean }> {
  const [bal, rows] = await Promise.all([balances("platform", PLATFORM), listStays({ limit: 5000 })]);
  const escrow = bal[ESCROW] ?? 0;
  const expected = rows.filter((b) => b.status === "pending" || b.status === "confirmed").reduce((s, b) => s + b.total_satang, 0);
  return { escrow, expected, ok: escrow === expected };
}

/** ทดสอบ e2e เท่านั้น: เลื่อนวันพัก/เวลาของรายการย้อนหลัง (เดโมในเครื่องเท่านั้น) */
export function demoShiftStay(id: string, days: number, minutes: number): StayBooking | null {
  if (!isDemo || process.env.VERCEL_ENV || process.env.NODE_ENV === "production") return null;
  const b = demo.bookings.find((x) => x.id === id);
  if (!b) return null;
  const d = Math.round(days) || 0, ms = (d * 1440 + (Math.round(minutes) || 0)) * 60_000;
  const back = (iso: string | null) => (iso ? new Date(Date.parse(iso) - ms).toISOString() : iso);
  b.check_in = addDays(b.check_in, -d); b.check_out = addDays(b.check_out, -d);
  b.expires_at = back(b.expires_at)!; b.created_at = back(b.created_at)!; b.confirmed_at = back(b.confirmed_at);
  return b;
}

// ── แจ้งเตือน ──
async function tellCustomer(b: StayBooking, kind: string, title: string, body: string) {
  await import("@/lib/bookings").then((m) => m.notify({ user_type: "customer", user_id: b.customer_id, kind, title, body, url: `/stays/bookings/${b.id}` })).catch((e) => console.error("stay notify", e));
}
const ENT: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ENT[c]);
/** แจ้งโรงแรม: อีเมลถึงผู้ติดต่อ + push (ถ้าเปิดรับ) — ไม่บล็อกงานหลัก */
async function tellPartner(p: Pick<Partner, "id" | "email" | "business_name">, title: string, body: string) {
  const html = `<div style="font-family:Tahoma,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #d4af37;border-radius:16px"><p style="letter-spacing:.2em;font-size:12px;color:#8f5e00;margin:0">MISTER BAMRUNGSUK · PARTNER</p><h2>${esc(title)}</h2><p>${esc(body)}</p><p style="font-size:13px;color:#6b6152">จัดการได้ที่พอร์ทัลพาร์ทเนอร์ → การจอง</p></div>`;
  if (p.email) await import("@/lib/email").then((m) => m.sendEmail({ to: p.email, subject: `[${p.business_name}] ${title}`, html })).catch(() => false);
  await import("@/lib/push").then((m) => m.sendPush("partner", p.id, { title, body, url: "/partner/portal/bookings", tag: "stay" })).catch(() => 0);
}
