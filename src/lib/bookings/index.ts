import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PLATFORM, WalletError, balances, post } from "@/lib/wallet";
import { getById, extraOf, type Applicant } from "@/lib/join/store";
import { getEarnings } from "@/lib/join/earnings-settings";
import { isLive, publicId } from "@/lib/home/live";
import { hasContact } from "@/lib/join/contact-guard";

// การจองลูกค้า ↔ Part-Time (supabase/booking/0001_booking.sql) — เงินเดินผ่าน wallet:
// ส่งคำขอ: ลูกค้า.available → ลูกค้า.held · ตอบรับ: held → บริษัท.escrow · ปฏิเสธ/หมดเวลา/ยกเลิกก่อนตอบรับ: held → available
export type PlaceType = "out" | "outdoor" | "mall" | "cafe" | "condo" | "hotel" | "spa";
export type Place = { type: PlaceType; label: string; detail: string; spa_id?: string; spa_name?: string };
export type Status = "requested" | "accepted" | "declined" | "expired" | "cancelled" | "cancel_requested" | "checked_in" | "completed" | "disputed" | "refunded";
export type Booking = {
  id: string; code: string; customer_id: string; customer_email: string | null; customer_name: string | null;
  parttime_id: string; parttime_mb: string; parttime_nick: string | null; starts_at: string; hours: 3 | 5; place: Place; note: string | null;
  price_satang: number; room_fee_satang: number; total_satang: number; status: Status; expires_at: string | null; decline_reason: string | null;
  accepted_at: string | null; declined_at: string | null; cancelled_at: string | null; checked_in_at: string | null; completed_at: string | null; created_at: string; updated_at: string;
};
export type Message = { id: number; booking_id: string; sender_type: "customer" | "parttime" | "system"; sender_id: string | null; body: string; blocked: boolean; created_at: string; read_at: string | null };
export type Notice = { id: number; user_type: "customer" | "parttime" | "admin"; user_id: string; kind: string; title: string; body: string | null; url: string | null; read_at: string | null; created_at: string };

export const RESPOND_MINUTES = 30;
export const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
type DemoB = { bookings: Booking[]; events: { booking_id: string; type: string; actor: string | null; data: unknown; created_at: string }[]; messages: Message[]; notices: Notice[] };
const g = globalThis as unknown as { __mbBook?: DemoB };
const demo: DemoB = (g.__mbBook ??= { bookings: [], events: [], messages: [], notices: [] } as DemoB);

export class BookingError extends Error { constructor(msg: string, public code = "bad", public data?: Record<string, unknown>) { super(msg); } }

/** ราคา 3 ชม. ตามสาย/ระดับ (หน้า "ราคาและส่วนแบ่ง") · 5 ชม. = ×1.5 */
export async function priceFor(a: Applicant, hours: 3 | 5): Promise<number> {
  const cfg = await getEarnings();
  const svc = a.package === "B" ? cfg.price3h.massage : cfg.price3h.eat;
  const p3 = extraOf(a).tier === "top" ? svc.top : svc.silver;
  return hours === 5 ? Math.round(p3 * 1.5) : p3;
}

const code = () => "BK-" + Math.random().toString(36).slice(2, 8).toUpperCase();
const now = () => new Date().toISOString();

async function insertBooking(b: Omit<Booking, "id" | "created_at" | "updated_at">): Promise<Booking> {
  if (isDemo) { const row: Booking = { ...b, id: crypto.randomUUID(), created_at: now(), updated_at: now() }; demo.bookings.unshift(row); return row; }
  const { data, error } = await db().from("bookings").insert(b).select().single();
  if (error) throw error;
  return data as Booking;
}
/** เปลี่ยนสถานะแบบมีเงื่อนไข (from) กันแข่งกันกด — คืน null ถ้าสถานะไม่ตรงแล้ว */
async function transition(id: string, from: Status[], patch: Partial<Booking>): Promise<Booking | null> {
  if (isDemo) {
    const b = demo.bookings.find((x) => x.id === id);
    if (!b || !from.includes(b.status)) return null;
    Object.assign(b, patch, { updated_at: now() });
    return b;
  }
  const { data, error } = await db().from("bookings").update({ ...patch, updated_at: now() }).eq("id", id).in("status", from).select().maybeSingle();
  if (error) throw error;
  return (data as Booking) ?? null;
}
export async function addEvent(booking_id: string, type: string, actor: string | null, data: unknown = null) {
  if (isDemo) { demo.events.push({ booking_id, type, actor, data, created_at: now() }); return; }
  await db().from("booking_events").insert({ booking_id, type, actor, data });
}
export async function notify(n: Omit<Notice, "id" | "read_at" | "created_at">) {
  if (isDemo) { demo.notices.unshift({ ...n, id: demo.notices.length + 1, read_at: null, created_at: now() }); return; }
  await db().from("notifications").insert(n).then(({ error }) => { if (error) console.error("notify", error.message); });
}

export async function getBooking(id: string): Promise<Booking | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const b = isDemo ? demo.bookings.find((x) => x.id === id) ?? null : ((await db().from("bookings").select().eq("id", id).maybeSingle()).data as Booking | null);
  return b ? (await sweep([b]))[0] : null;
}
export async function listForCustomer(customer_id: string): Promise<Booking[]> {
  const rows = isDemo ? demo.bookings.filter((b) => b.customer_id === customer_id) : (((await db().from("bookings").select().eq("customer_id", customer_id).order("starts_at", { ascending: false }).limit(100)).data ?? []) as Booking[]);
  return sweep(rows);
}
export async function listForParttime(parttime_id: string): Promise<Booking[]> {
  const rows = isDemo ? demo.bookings.filter((b) => b.parttime_id === parttime_id) : (((await db().from("bookings").select().eq("parttime_id", parttime_id).order("starts_at", { ascending: false }).limit(100)).data ?? []) as Booking[]);
  return sweep(rows);
}
export async function listAll(limit = 300): Promise<Booking[]> {
  const rows = isDemo ? demo.bookings.slice(0, limit) : (((await db().from("bookings").select().order("created_at", { ascending: false }).limit(limit)).data ?? []) as Booking[]);
  return sweep(rows);
}

/** คำขอที่เลยเวลาตอบ → หมดเวลา + คืนเงินที่กันไว้ (ทำตอนอ่าน ไม่ต้องพึ่ง cron) */
async function sweep(rows: Booking[]): Promise<Booking[]> {
  const out: Booking[] = [];
  for (const b of rows) {
    if (b.status === "requested" && b.expires_at && Date.parse(b.expires_at) < Date.now()) {
      const r = await releaseHold(b, "expired", "system", { expires_at: b.expires_at }).catch((e) => { console.error("sweep", e); return null; });
      out.push(r ?? b);
    } else out.push(b);
  }
  return out;
}

async function releaseHold(b: Booking, to: "declined" | "expired" | "cancelled", actor: string, extra: Partial<Booking> = {}): Promise<Booking | null> {
  const stamp = to === "declined" ? { declined_at: now() } : to === "cancelled" ? { cancelled_at: now() } : {};
  const r = await transition(b.id, ["requested"], { status: to, ...stamp, ...extra });
  if (!r) return null;
  await post("release", { type: "booking", id: b.id }, `release:${b.id}`, `คืนเงินที่กันไว้ · ${b.code}`, actor, [
    { owner_type: "customer", owner_id: b.customer_id, bucket: "held", amount: -b.total_satang },
    { owner_type: "customer", owner_id: b.customer_id, bucket: "available", amount: b.total_satang },
  ]);
  await addEvent(b.id, to, actor);
  const msg = to === "declined" ? `${b.parttime_nick ?? "เพื่อน"} ไม่สะดวกนัดนี้ · คืนเงินเข้ากระเป๋าแล้ว` : to === "expired" ? "เพื่อนไม่ได้ตอบรับภายในเวลา · คืนเงินเข้ากระเป๋าแล้ว" : "ยกเลิกคำขอแล้ว · คืนเงินเข้ากระเป๋าแล้ว";
  await notify({ user_type: "customer", user_id: b.customer_id, kind: `booking_${to}`, title: `นัด ${b.code}`, body: msg, url: `/order/${b.id}` });
  return r;
}

export type CreateInput = { pid: string; hours: 3 | 5; starts_at: string; place: Place; note: string };
/** ลูกค้าส่งคำขอนัด — กันเงินจากกระเป๋า (ยอดไม่พอ → BookingError code=funds พร้อมยอดที่ขาด) */
export async function createBooking(cust: { sub: string; email: string; name?: string }, input: CreateInput, findPt: (pid: string) => Promise<Applicant | null>, roomFee = 0): Promise<Booking> {
  const a = await findPt(input.pid);
  if (!a || !isLive(a)) throw new BookingError("เพื่อนคนนี้ยังไม่เปิดรับงาน", "unavailable");
  const start = Date.parse(input.starts_at);
  if (!Number.isFinite(start) || start < Date.now() + 60 * 60_000 || start > Date.now() + 60 * 86400_000) throw new BookingError("เลือกเวลานัดล่วงหน้าอย่างน้อย 1 ชม. และไม่เกิน 60 วัน");
  const clash = (await listForParttime(a.id)).some((b) => ["requested", "accepted", "checked_in"].includes(b.status) && Math.abs(Date.parse(b.starts_at) - start) < Math.max(b.hours, input.hours) * 3600_000);
  if (clash) throw new BookingError("ช่วงเวลานี้เพื่อนมีนัดแล้ว ลองเลือกเวลาอื่น", "clash");
  if (input.note && hasContact(input.note)) throw new BookingError("ข้อความฝากถึงเพื่อนห้ามมีเบอร์โทร LINE หรือช่องทางติดต่อ");
  const price = (await priceFor(a, input.hours)) * 100;
  const total = price + Math.max(0, Math.round(roomFee)) * 100;
  const bal = await balances("customer", cust.sub);
  if ((bal.available ?? 0) < total) throw new BookingError("ยอดในกระเป๋าไม่พอ", "funds", { need: total, available: bal.available ?? 0, short: total - (bal.available ?? 0) });

  const b = await insertBooking({
    code: code(), customer_id: cust.sub, customer_email: cust.email, customer_name: cust.name ?? null, parttime_id: a.id, parttime_mb: a.mb_code, parttime_nick: a.nickname,
    starts_at: new Date(start).toISOString(), hours: input.hours, place: input.place, note: input.note.slice(0, 300) || null,
    price_satang: price, room_fee_satang: total - price, total_satang: total, status: "requested", expires_at: new Date(Date.now() + RESPOND_MINUTES * 60_000).toISOString(),
    decline_reason: null, accepted_at: null, declined_at: null, cancelled_at: null, checked_in_at: null, completed_at: null,
  });
  try {
    await post("hold", { type: "booking", id: b.id }, `hold:${b.id}`, `กันเงินนัด ${b.code}`, `customer:${cust.sub}`, [
      { owner_type: "customer", owner_id: cust.sub, bucket: "available", amount: -total },
      { owner_type: "customer", owner_id: cust.sub, bucket: "held", amount: total },
    ]);
  } catch (e) {
    await transition(b.id, ["requested"], { status: "cancelled", cancelled_at: now() });
    if (e instanceof WalletError) throw new BookingError("ยอดในกระเป๋าไม่พอ", "funds", { need: total });
    throw e;
  }
  await addEvent(b.id, "requested", `customer:${cust.sub}`);
  await notify({ user_type: "parttime", user_id: a.id, kind: "booking_new", title: "มีงานเข้าใหม่", body: `${b.code} · ${input.hours} ชม. · ตอบภายใน ${RESPOND_MINUTES} นาที`, url: `/join/profile/${a.mb_code}/jobs` });
  return b;
}

/** Part-Time ตอบรับ / ปฏิเสธ */
export async function respond(id: string, parttime_id: string, accept: boolean, reason = ""): Promise<Booking> {
  const b = await getBooking(id);
  if (!b || b.parttime_id !== parttime_id) throw new BookingError("ไม่พบงานนี้", "notfound");
  if (b.status !== "requested") throw new BookingError(b.status === "expired" ? "หมดเวลาตอบรับแล้ว" : "งานนี้ตอบไปแล้ว", "state");
  if (!accept) {
    const r = await releaseHold(b, "declined", `parttime:${parttime_id}`, { decline_reason: reason.slice(0, 200) || null });
    if (!r) throw new BookingError("งานนี้ตอบไปแล้ว", "state");
    return r;
  }
  const r = await transition(b.id, ["requested"], { status: "accepted", accepted_at: now(), expires_at: null });
  if (!r) throw new BookingError("งานนี้ตอบไปแล้ว", "state");
  await post("confirm", { type: "booking", id: b.id }, `confirm:${b.id}`, `ชำระค่านัด ${b.code}`, `parttime:${parttime_id}`, [
    { owner_type: "customer", owner_id: b.customer_id, bucket: "held", amount: -b.total_satang },
    { owner_type: "platform", owner_id: PLATFORM, bucket: "escrow", amount: b.total_satang },
  ]);
  await addEvent(b.id, "accepted", `parttime:${parttime_id}`);
  await notify({ user_type: "customer", user_id: b.customer_id, kind: "booking_accepted", title: `${b.parttime_nick ?? "เพื่อน"} ยืนยันนัดแล้ว`, body: `${b.code} · เงินพักไว้กับเราจนจบนัด`, url: `/order/${b.id}` });
  await sendMessage(b, "system", null, `${b.parttime_nick ?? "เพื่อน"} ยืนยันนัดแล้ว · คุยรายละเอียดกันได้ที่นี่ (ห้ามแลกเบอร์หรือช่องทางนอกแอป)`);
  return r;
}

/** ลูกค้ายกเลิก: ก่อนตอบรับ = คืนเงินทันที · หลังตอบรับ = ส่งเรื่องให้แอดมินตัดสินตามกติกา */
export async function cancelByCustomer(id: string, customer_id: string, reason: string): Promise<Booking> {
  const b = await getBooking(id);
  if (!b || b.customer_id !== customer_id) throw new BookingError("ไม่พบการจอง", "notfound");
  if (b.status === "requested") {
    const r = await releaseHold(b, "cancelled", `customer:${customer_id}`, { decline_reason: reason.slice(0, 200) || null });
    if (r) return r;
  }
  if (b.status === "accepted") {
    const r = await transition(b.id, ["accepted"], { status: "cancel_requested", decline_reason: reason.slice(0, 200) || null });
    if (r) {
      await addEvent(b.id, "cancel_requested", `customer:${customer_id}`, { reason });
      await notify({ user_type: "parttime", user_id: b.parttime_id, kind: "booking_cancel_requested", title: `ลูกค้าขอยกเลิก ${b.code}`, body: "ทีมงานกำลังตรวจตามกติกา", url: `/join/profile/${b.parttime_mb}/jobs` });
      return r;
    }
  }
  throw new BookingError("ยกเลิกการจองนี้ไม่ได้แล้ว", "state");
}

// ── แชท (ผูกกับการจอง) ──
export async function listMessages(booking_id: string, after = 0): Promise<Message[]> {
  if (isDemo) return demo.messages.filter((m) => m.booking_id === booking_id && m.id > after);
  const { data, error } = await db().from("messages").select().eq("booking_id", booking_id).gt("id", after).order("id").limit(200);
  if (error) throw error;
  return (data ?? []) as Message[];
}
export async function sendMessage(b: Booking, sender_type: Message["sender_type"], sender_id: string | null, body: string): Promise<Message> {
  const text = body.trim().slice(0, 1000);
  if (!text) throw new BookingError("พิมพ์ข้อความก่อนส่ง");
  const blocked = sender_type !== "system" && hasContact(text);
  const row = { booking_id: b.id, sender_type, sender_id, body: text, blocked };
  let m: Message;
  if (isDemo) { m = { ...row, id: demo.messages.length + 1, created_at: now(), read_at: null }; demo.messages.push(m); }
  else { const { data, error } = await db().from("messages").insert(row).select().single(); if (error) throw error; m = data as Message; }
  if (!blocked && sender_type !== "system") {
    const to = sender_type === "customer" ? { user_type: "parttime" as const, user_id: b.parttime_id, url: `/join/profile/${b.parttime_mb}/jobs` } : { user_type: "customer" as const, user_id: b.customer_id, url: `/chat/${b.id}` };
    await notify({ ...to, kind: "message", title: sender_type === "customer" ? "ข้อความใหม่จากลูกค้า" : `ข้อความใหม่จาก ${b.parttime_nick ?? "เพื่อน"}`, body: text.slice(0, 80) });
  }
  return m;
}

// ── แจ้งเตือน ──
export async function listNotices(user_type: Notice["user_type"], user_id: string, limit = 50): Promise<Notice[]> {
  if (isDemo) return demo.notices.filter((n) => n.user_type === user_type && n.user_id === user_id).slice(0, limit);
  const { data, error } = await db().from("notifications").select().eq("user_type", user_type).eq("user_id", user_id).order("id", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as Notice[];
}
export async function markNoticesRead(user_type: Notice["user_type"], user_id: string) {
  if (isDemo) { for (const n of demo.notices) if (n.user_type === user_type && n.user_id === user_id && !n.read_at) n.read_at = now(); return; }
  await db().from("notifications").update({ read_at: now() }).eq("user_type", user_type).eq("user_id", user_id).is("read_at", null);
}

/** ข้อมูลสาธารณะของ Part-Time สำหรับหน้าจอง/การ์ด (ไม่เปิดเผยรหัสผู้สมัคร) */
export const ptPublic = (b: Booking) => ({ pid: publicId(b.parttime_mb), nick: b.parttime_nick ?? "เพื่อน", img: `/api/public/pt-photo?id=${publicId(b.parttime_mb)}&i=0` });
export const findLiveByPid = async (pid: string, list: () => Promise<Applicant[]>) => (await list()).find((a) => publicId(a.mb_code) === pid) ?? null;
export { getById };
