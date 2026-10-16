import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PLATFORM, WalletError, balances, move, type Leg, type MoveTx } from "@/lib/wallet";
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
  pt_done_at?: string | null; tip_satang?: number; share_pct?: number | null; matured_at?: string | null; resolution?: Record<string, unknown> | null;
  pt_pending_satang?: number | null; // ยอดที่เข้า PT.pending จริง (0002_atomic) — ปล่อยเงินตามนี้
};
export type Message = { id: number; booking_id: string; sender_type: "customer" | "parttime" | "system"; sender_id: string | null; body: string; blocked: boolean; flag?: string | null; created_at: string; read_at: string | null };
export type Notice = { id: number; user_type: "customer" | "parttime" | "admin"; user_id: string; kind: string; title: string; body: string | null; url: string | null; read_at: string | null; created_at: string };

export const RESPOND_MINUTES = 30;
export const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
type DemoB = { bookings: Booking[]; events: { booking_id: string; type: string; actor: string | null; data: unknown; created_at: string }[]; messages: Message[]; notices: Notice[] };
const g = globalThis as unknown as { __mbBook?: DemoB };
const demo: DemoB = (g.__mbBook ??= { bookings: [], events: [], messages: [], notices: [] } as DemoB);

/** เปลี่ยนสถานะการจอง + ลงเงินใน transaction เดียว (wallet_move) — null = สถานะเปลี่ยนไปแล้ว ไม่ลงเงิน
 *  นัดที่สปาพาร์ทเนอร์ → sync พอร์ทัลพาร์ทเนอร์เหมือน transition() */
export async function moveBooking(id: string, from: Status[], patch: Partial<Booking>, tx: MoveTx | null): Promise<Booking | null> {
  let r: Booking | null;
  try {
    r = await move<Booking>({ table: "bookings", id, from, patch: patch as Record<string, unknown>, demoRow: () => demo.bookings.find((x) => x.id === id) }, tx);
  } catch (e) {
    // trigger bookings_no_clash (0003_guards.sql): เพื่อนมีนัดซ้อนเวลา (กดจองพร้อมกัน)
    if (/booking clash/.test(String((e as { message?: string })?.message ?? ""))) throw new BookingError("ช่วงเวลานี้เพื่อนมีนัดแล้ว ลองเลือกเวลาอื่น", "clash");
    throw e;
  }
  if (r && patch.status && r.place?.spa_id) await import("@/lib/partner/portal").then((m) => m.syncSpaBooking(r)).catch((e) => console.error("partner sync", e));
  return r;
}
const ref = (b: { id: string }) => ({ type: "booking", id: b.id });
const legsOf = (...l: (Leg | false | 0 | null)[]) => l.filter(Boolean) as Leg[];
export { legsOf };

export class BookingError extends Error { constructor(msg: string, public code = "bad", public data?: Record<string, unknown>) { super(msg); } }

/** ราคา 3 ชม. ตามสาย/ระดับ (หน้า "ราคาและส่วนแบ่ง") · 5 ชม. = ×1.5 */
export async function priceFor(a: Applicant, hours: 3 | 5): Promise<number> {
  const cfg = await getEarnings();
  const svc = a.package === "B" ? cfg.price3h.massage : cfg.price3h.eat;
  const p3 = extraOf(a).tier === "top" ? svc.top : svc.silver;
  return hours === 5 ? Math.round(p3 * (cfg.fiveHourMultiplier || 1.5)) : p3;
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
export async function transition(id: string, from: Status[], patch: Partial<Booking>): Promise<Booking | null> {
  let r: Booking | null;
  if (isDemo) {
    const b = demo.bookings.find((x) => x.id === id);
    if (!b || !from.includes(b.status)) return null;
    r = Object.assign(b, patch, { updated_at: now() });
  } else {
    const { data, error } = await db().from("bookings").update({ ...patch, updated_at: now() }).eq("id", id).in("status", from).select().maybeSingle();
    if (error) throw error;
    r = (data as Booking) ?? null;
  }
  // นัดที่สปาพาร์ทเนอร์ → พอร์ทัลพาร์ทเนอร์เห็นการจอง (#26) · พลาดไม่กระทบเงิน
  if (r && patch.status && r.place?.spa_id) await import("@/lib/partner/portal").then((m) => m.syncSpaBooking(r!)).catch((e) => console.error("partner sync", e));
  return r;
}
export async function addEvent(booking_id: string, type: string, actor: string | null, data: unknown = null) {
  if (isDemo) { demo.events.push({ booking_id, type, actor, data, created_at: now() }); return; }
  await db().from("booking_events").insert({ booking_id, type, actor, data });
}
export async function notify(n: Omit<Notice, "id" | "read_at" | "created_at">) {
  if (isDemo) demo.notices.unshift({ ...n, id: demo.notices.length + 1, read_at: null, created_at: now() });
  else await db().from("notifications").insert(n).then(({ error }) => { if (error) console.error("notify", error.message); });
  // web push ไปทุกอุปกรณ์ที่ผู้ใช้เปิดรับไว้ (#16)
  // แอดมิน: ทุกเครื่องของแอดมินที่เปิดรับ (user_id "all") — SOS / ยอดไม่ตรง / ห้องเต็ม ถึงมือทันที
  const [pt, pid] = n.user_type === "admin" ? ["admin", "all"] : [n.user_type, n.user_id];
  await import("@/lib/push").then((m) => m.sendPush(pt, pid, { title: n.title, body: n.body, url: n.url, tag: n.kind === "sos" ? undefined : n.kind })).catch(() => 0);
}

export async function getBooking(id: string): Promise<Booking | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const b = isDemo ? demo.bookings.find((x) => x.id === id) ?? null : ((await db().from("bookings").select().eq("id", id).maybeSingle()).data as Booking | null);
  return b ? (await sweep([b]))[0] : null;
}
// พาร์ทเนอร์แจ้งห้องเต็ม/ยืนยันห้อง → แจ้งลูกค้า + เพื่อน + ทีมงาน (#26)
export async function spaRoomUpdate(code: string, status: "confirmed" | "full", room: string | null) {
  const b = isDemo ? demo.bookings.find((x) => x.code === code) ?? null : ((await db().from("bookings").select().eq("code", code).maybeSingle()).data as Booking | null);
  if (!b) return;
  const spa = b.place.spa_name ?? "สปา";
  if (status === "confirmed") {
    await addEvent(b.id, "spa_confirmed", "partner", { room });
    await notify({ user_type: "customer", user_id: b.customer_id, kind: "spa_confirmed", title: `${spa} เตรียมห้องให้แล้ว`, body: `${b.code}${room ? ` · ${room}` : ""}`, url: `/order/${b.id}` });
    return;
  }
  await addEvent(b.id, "spa_full", "partner", null);
  await notify({ user_type: "customer", user_id: b.customer_id, kind: "spa_full", title: `${spa} แจ้งห้องเต็ม`, body: `${b.code} · ทีมงานจะติดต่อเพื่อเปลี่ยนสถานที่หรือเวลา หรือขอยกเลิกในหน้าการจองได้`, url: `/order/${b.id}` });
  await notify({ user_type: "parttime", user_id: b.parttime_id, kind: "spa_full", title: `${spa} แจ้งห้องเต็ม ${b.code}`, body: "รอทีมงานประสานสถานที่ใหม่", url: `/join/profile/${b.parttime_mb}/jobs` });
  await notify({ user_type: "admin", user_id: "ops", kind: "spa_full", title: `สปาแจ้งห้องเต็ม ${b.code}`, body: spa, url: "/admin/orders" });
}

export async function listForCustomer(customer_id: string): Promise<Booking[]> {
  const rows = isDemo ? demo.bookings.filter((b) => b.customer_id === customer_id) : (((await db().from("bookings").select().eq("customer_id", customer_id).order("starts_at", { ascending: false }).limit(100)).data ?? []) as Booking[]);
  return sweep(rows);
}
export async function listForParttime(parttime_id: string): Promise<Booking[]> {
  const rows = isDemo ? demo.bookings.filter((b) => b.parttime_id === parttime_id) : (((await db().from("bookings").select().eq("parttime_id", parttime_id).order("starts_at", { ascending: false }).limit(100)).data ?? []) as Booking[]);
  return sweep(rows);
}
/** การจองของ Part-Time แบบไม่ประมวลผลอัตโนมัติ (โหมดสาธิต ใช้นับงานในเดือน) */
export const rawForParttime = (parttime_id: string) => demo.bookings.filter((b) => b.parttime_id === parttime_id);
export async function listAll(limit = 300): Promise<Booking[]> {
  const rows = isDemo ? demo.bookings.slice(0, limit) : (((await db().from("bookings").select().order("created_at", { ascending: false }).limit(limit)).data ?? []) as Booking[]);
  return sweep(rows);
}

/** คำขอที่เลยเวลาตอบ → หมดเวลา + คืนเงินที่กันไว้ (ทำตอนอ่าน ไม่ต้องพึ่ง cron) */
async function sweep(rows: Booking[]): Promise<Booking[]> {
  const out: Booking[] = [];
  const { sweepDay } = await import("./day");
  rows = await sweepDay(rows);
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
  const r = await moveBooking(b.id, ["requested"], { status: to, ...stamp, ...extra }, { kind: "release", ref: ref(b), idem: `release:${b.id}`, note: `คืนเงินที่กันไว้ · ${b.code}`, actor, legs: [
    { owner_type: "customer", owner_id: b.customer_id, bucket: "held", amount: -b.total_satang },
    { owner_type: "customer", owner_id: b.customer_id, bucket: "available", amount: b.total_satang },
  ] });
  if (!r) return null;
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
    price_satang: price, room_fee_satang: total - price, total_satang: total, status: "cancelled", expires_at: new Date(Date.now() + RESPOND_MINUTES * 60_000).toISOString(),
    decline_reason: null, accepted_at: null, declined_at: null, cancelled_at: null, checked_in_at: null, completed_at: null,
    pt_done_at: null, tip_satang: 0, share_pct: null, matured_at: null, resolution: null,
  });
  // แถวเริ่มเป็น cancelled แล้วเปิดเป็น requested พร้อมกันเงิน (อะตอมมิก) — กันเงินไม่ได้ = ไม่มีคำขอค้างให้เพื่อนกดรับ
  let opened: Booking | null;
  try {
    opened = await moveBooking(b.id, ["cancelled"], { status: "requested" }, { kind: "hold", ref: ref(b), idem: `hold:${b.id}`, note: `กันเงินนัด ${b.code}`, actor: `customer:${cust.sub}`, legs: [
      { owner_type: "customer", owner_id: cust.sub, bucket: "available", amount: -total },
      { owner_type: "customer", owner_id: cust.sub, bucket: "held", amount: total },
    ] });
  } catch (e) {
    await transition(b.id, ["cancelled"], { cancelled_at: now() }).catch(() => null);
    if (e instanceof WalletError) throw new BookingError("ยอดในกระเป๋าไม่พอ", "funds", { need: total });
    throw e;
  }
  if (!opened) throw new BookingError("สร้างคำขอนัดไม่สำเร็จ กรุณาลองใหม่");
  Object.assign(b, opened);
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
  const r = await moveBooking(b.id, ["requested"], { status: "accepted", accepted_at: now(), expires_at: null }, { kind: "confirm", ref: ref(b), idem: `confirm:${b.id}`, note: `ชำระค่านัด ${b.code}`, actor: `parttime:${parttime_id}`, legs: [
    { owner_type: "customer", owner_id: b.customer_id, bucket: "held", amount: -b.total_satang },
    { owner_type: "platform", owner_id: PLATFORM, bucket: "escrow", amount: b.total_satang },
  ] });
  if (!r) throw new BookingError("งานนี้ตอบไปแล้ว", "state");
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
      // กติกายกเลิกอัตโนมัติ (#23): เปิดในตั้งค่าการเงิน → คืนตาม % ทันที ส่วนที่เหลือแบ่งให้เพื่อนตามปกติ
      const { getMoney, cancelRefundPct } = await import("@/lib/wallet/settings");
      const pct = cancelRefundPct(await getMoney(), b.starts_at);
      if (pct !== null) {
        const { adminResolve } = await import("./day");
        const done = await adminResolve(b.id, "auto:cancel-rule", { action: "refund", refundPct: pct, note: `ยกเลิกตามกติกา · คืน ${pct}%` });
        await notify({ user_type: "parttime", user_id: b.parttime_id, kind: "booking_cancelled", title: `ลูกค้ายกเลิก ${b.code}`, body: pct < 100 ? `ยกเลิกช้า · คุณได้ส่วนแบ่งจากยอดที่ไม่คืน ${100 - pct}%` : "ยกเลิกล่วงหน้าตามกติกา", url: `/join/profile/${b.parttime_mb}/jobs` });
        if (done) return done;
      }
      await notify({ user_type: "parttime", user_id: b.parttime_id, kind: "booking_cancel_requested", title: `ลูกค้าขอยกเลิก ${b.code}`, body: "ทีมงานกำลังตรวจตามกติกา", url: `/join/profile/${b.parttime_mb}/jobs` });
      await notify({ user_type: "admin", user_id: "ops", kind: "cancel_req", title: `ขอยกเลิกนัด ${b.code}`, body: reason.slice(0, 200) || "ไม่ระบุเหตุผล", url: "/admin/orders" });
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
  // ตัวกรองแชท (ช่องทางติดต่อ + คำห้ามส่ง) — ถูกกันก็ยังเก็บไว้ให้ทีมงานตรวจ (flag = เหตุผล)
  const chk = sender_type === "system" ? { blocked: false as const } : await (await import("@/lib/chat-guard")).checkChat(text);
  const blocked = chk.blocked;
  const row = { booking_id: b.id, sender_type, sender_id, body: text, blocked, flag: chk.blocked ? chk.flag : null };
  let m: Message;
  if (isDemo) { m = { ...row, id: demo.messages.length + 1, created_at: now(), read_at: null }; demo.messages.push(m); }
  else { const { data, error } = await db().from("messages").insert(row).select().single(); if (error) throw error; m = data as Message; }
  if (blocked) {
    // ฝ่าฝืนครบจำนวนครั้งในนัดนี้ → แจ้งทีมงาน (ครั้งที่ครบพอดี และทุก ๆ รอบถัดไป)
    const limit = (await (await import("@/lib/chat-guard")).getChatRules()).strikeLimit;
    const n = isDemo ? demo.messages.filter((x) => x.booking_id === b.id && x.sender_type === sender_type && x.blocked).length
      : ((await db().from("messages").select("id", { count: "exact", head: true }).eq("booking_id", b.id).eq("sender_type", sender_type).eq("blocked", true)).count ?? 0);
    if (n > 0 && n % limit === 0) await notify({ user_type: "admin", user_id: "cs", kind: "chat_violation", title: `แชทฝ่าฝืน ${n} ครั้ง · ${b.code}`, body: `${sender_type === "customer" ? `ลูกค้า ${b.customer_email ?? ""}` : `Part-Time ${b.parttime_mb}`} · ล่าสุด: ${text.slice(0, 120)}`, url: `/admin/chats/${b.id}` });
  }
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


// ── แจ้งเตือนของแอดมิน (SOS · ยอดไม่ตรง · ห้องเต็ม · ขอลบบัญชี ฯลฯ) — ทุก user_id ของ user_type=admin ──
export async function listAdminNotices(limit = 100): Promise<Notice[]> {
  if (isDemo) return demo.notices.filter((n) => n.user_type === "admin").slice(0, limit);
  const { data, error } = await db().from("notifications").select().eq("user_type", "admin").order("id", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as Notice[];
}
export async function markAdminNoticeRead(id: number | "all") {
  if (isDemo) { for (const n of demo.notices) if (n.user_type === "admin" && !n.read_at && (id === "all" || n.id === id)) n.read_at = now(); return; }
  let q = db().from("notifications").update({ read_at: now() }).eq("user_type", "admin").is("read_at", null);
  if (id !== "all") q = q.eq("id", id);
  await q;
}
/** ข้อมูลสาธารณะของ Part-Time สำหรับหน้าจอง/การ์ด (ไม่เปิดเผยรหัสผู้สมัคร) */
export const ptPublic = (b: Booking) => ({ pid: publicId(b.parttime_mb), nick: b.parttime_nick ?? "เพื่อน", img: `/api/public/pt-photo?id=${publicId(b.parttime_mb)}&i=0` });
export const findLiveByPid = async (pid: string, list: () => Promise<Applicant[]>) => (await list()).find((a) => publicId(a.mb_code) === pid) ?? null;
export { getById };

/** แชททั้งหมดล่าสุด (สำหรับทีมงาน — รวมข้อความที่ถูกกัน) */
export async function recentMessages(limit = 5000): Promise<Message[]> {
  if (isDemo) return demo.messages.slice(-limit).reverse();
  const { data, error } = await db().from("messages").select().order("id", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as Message[];
}
