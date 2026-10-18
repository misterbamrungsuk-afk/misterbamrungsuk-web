import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { BookingError, isDemo, listMessages, type Booking, type Message, type Notice } from "./index";
import { CHAT_ACTIVE, UNSEND_MS, UNSENT_TEXT } from "@/lib/chat-manage-rules";

// จัดการแชทของผู้ใช้ (supabase/booking/0012_chat_manage.sql) — ไม่ลบข้อความจริงเลย ทุกอย่างเปลี่ยนแค่สิ่งที่ผู้ใช้เห็น
// ทีมงาน (/admin/chats/[id]) เห็นข้อความเดิมครบพร้อมป้ายว่าผู้ใช้ทำอะไร (ใช้ตรวจข้อพิพาท)
// ยังไม่รันไฟล์ SQL: อ่าน = ถือว่าไม่มีการซ่อน (แชทปกติใช้ได้) · เขียน = แจ้ง "ยังไม่เปิดใช้งาน"
export type Role = "customer" | "parttime";
export type Who = { role: Role; id: string };
export type ChatHide = { user_type: Role; user_id: string; booking_id: string; mode: "hide" | "delete"; upto_id: number | null; cleared_upto: number | null; created_at: string };
type MsgHide = { user_type: Role; user_id: string; message_id: number; created_at: string };

let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
const g = globalThis as unknown as { __mbBook?: { messages: Message[]; notices: Notice[] }; __mbChatHide?: { mh: MsgHide[]; ch: ChatHide[] } };
const demo = (g.__mbChatHide ??= { mh: [], ch: [] });
const demoMsgs = () => g.__mbBook?.messages ?? [];
const now = () => new Date().toISOString();
const OFF = () => new BookingError("ฟีเจอร์จัดการแชทยังไม่เปิดใช้งาน", "off");
const WHO_TH: Record<Role, string> = { customer: "ลูกค้า", parttime: "Part-Time" };

async function getMessage(id: number): Promise<Message | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  if (isDemo) return demoMsgs().find((m) => m.id === id) ?? null;
  const { data, error } = await db().from("messages").select().eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Message) ?? null;
}
async function maxId(booking_id: string): Promise<number> {
  if (isDemo) return demoMsgs().filter((m) => m.booking_id === booking_id).reduce((a, m) => Math.max(a, m.id), 0);
  const { data } = await db().from("messages").select("id").eq("booking_id", booking_id).order("id", { ascending: false }).limit(1).maybeSingle();
  return Number((data as { id?: number } | null)?.id ?? 0);
}

/** สถานะซ่อน/ลบกล่องแชทของฉันในนัดนี้ (ยังไม่รัน SQL = null) */
export async function chatHide(who: Who, booking_id: string): Promise<ChatHide | null> {
  if (isDemo) return demo.ch.find((x) => x.user_type === who.role && x.user_id === who.id && x.booking_id === booking_id) ?? null;
  const { data, error } = await db().from("chat_hides").select().eq("user_type", who.role).eq("user_id", who.id).eq("booking_id", booking_id).maybeSingle();
  if (error) return null;
  return (data as ChatHide) ?? null;
}
/** ข้อความที่ฉันลบ (เฉพาะฉัน) จากชุด id ที่ให้มา */
async function myHidden(who: Who, ids: number[]): Promise<Set<number>> {
  if (!ids.length) return new Set();
  if (isDemo) return new Set(demo.mh.filter((x) => x.user_type === who.role && x.user_id === who.id && ids.includes(x.message_id)).map((x) => x.message_id));
  const { data, error } = await db().from("message_hides").select("message_id").eq("user_type", who.role).eq("user_id", who.id).in("message_id", ids);
  if (error) return new Set();
  return new Set(((data ?? []) as { message_id: number }[]).map((x) => Number(x.message_id)));
}

export type ViewMsg = { id: number; sender_type: Message["sender_type"]; body: string; blocked: boolean; created_at: string; unsent?: true };
const view = (m: Message): ViewMsg => (m.unsent_at
  ? { id: m.id, sender_type: m.sender_type, body: "", blocked: m.blocked, created_at: m.created_at, unsent: true } // ไม่ส่งเนื้อความเดิมออกไปอีก
  : { id: m.id, sender_type: m.sender_type, body: m.body, blocked: m.blocked, created_at: m.created_at });

/** ข้อความที่ฉันเห็น หลัง id `after` · last = id ล่าสุดที่อ่านมาแล้ว (รวมที่ซ่อน) ให้หน้าเว็บ poll ต่อจากตรงนี้
 *  since = เวลาที่ poll ครั้งก่อน → unsent = id ข้อความ (ที่โหลดไปแล้ว) ซึ่งถูกยกเลิกการส่งหลังจากนั้น */
export async function messagesFor(who: Who, booking_id: string, after: number, since: string | null): Promise<{ messages: ViewMsg[]; last: number; unsent: number[]; ts: string }> {
  const ts = now(); // จับเวลาก่อนอ่าน — ยกเลิกระหว่างอ่านจะติดรอบถัดไป
  const ch = await chatHide(who, booking_id);
  const from = Math.max(after, ch?.cleared_upto ?? 0);
  const rows = await listMessages(booking_id, from);
  const hid = await myHidden(who, rows.map((m) => m.id));
  // ข้อความที่ถูกกัน: ผู้ส่งเห็นของตัวเอง อีกฝ่ายไม่เห็น
  const messages = rows.filter((m) => (!m.blocked || m.sender_type === who.role) && !hid.has(m.id)).map(view);
  let unsent: number[] = [];
  const sinceMs = since ? Date.parse(since) : NaN;
  if (Number.isFinite(sinceMs) && after > 0) {
    const iso = new Date(sinceMs).toISOString();
    if (isDemo) unsent = demoMsgs().filter((m) => m.booking_id === booking_id && m.id <= after && m.unsent_at && m.unsent_at > iso).map((m) => m.id);
    else {
      const { data, error } = await db().from("messages").select("id").eq("booking_id", booking_id).lte("id", after).gt("unsent_at", iso).limit(200);
      if (!error) unsent = ((data ?? []) as { id: number }[]).map((x) => Number(x.id));
    }
  }
  return { messages, last: rows.length ? rows[rows.length - 1].id : from, unsent, ts };
}

/** แจ้งเตือน "ข้อความใหม่" ของข้อความนี้ฝั่งผู้รับ → อ่านแล้ว (+ ยกเลิกการส่ง = ลบตัวอย่างข้อความออก) */
async function quietNotice(b: Booking, m: Message, redact: boolean) {
  const to = m.sender_type === "customer" ? { user_type: "parttime" as const, user_id: b.parttime_id, url: `/join/profile/${b.parttime_mb}/chat/${b.id}` } : { user_type: "customer" as const, user_id: b.customer_id, url: `/chat/${b.id}` };
  const preview = m.body.trim().slice(0, 80);
  const lo = new Date(Date.parse(m.created_at) - 10_000).toISOString(), hi = new Date(Date.parse(m.created_at) + 120_000).toISOString();
  if (isDemo) {
    for (const n of g.__mbBook?.notices ?? []) if (n.user_type === to.user_type && n.user_id === to.user_id && n.kind === "message" && n.url === to.url && n.body === preview && n.created_at >= lo && n.created_at <= hi) { n.read_at ??= now(); if (redact) n.body = UNSENT_TEXT; }
    return;
  }
  const q = (patch: Record<string, unknown>) => db().from("notifications").update(patch).eq("user_type", to.user_type).eq("user_id", to.user_id).eq("kind", "message").eq("url", to.url).eq("body", preview).gte("created_at", lo).lte("created_at", hi);
  await q({ read_at: now() }).is("read_at", null);
  if (redact) await q({ body: UNSENT_TEXT });
}
/** แจ้งเตือนข้อความของแชทนี้ฝั่งฉัน → อ่านแล้ว (ซ่อน/ลบกล่องแชทแล้วไม่ต้องค้างตัวนับ) */
async function readChatNotices(who: Who, b: Booking) {
  const url = who.role === "customer" ? `/chat/${b.id}` : `/join/profile/${b.parttime_mb}/chat/${b.id}`;
  if (isDemo) { for (const n of g.__mbBook?.notices ?? []) if (n.user_type === who.role && n.user_id === who.id && n.kind === "message" && n.url === url) n.read_at ??= now(); return; }
  await db().from("notifications").update({ read_at: now() }).eq("user_type", who.role).eq("user_id", who.id).eq("kind", "message").eq("url", url).is("read_at", null);
}

/** ยกเลิกการส่ง — ผู้ส่งเท่านั้น · ภายใน 24 ชม. · ไม่ใช่ข้อความระบบ/ที่ถูกกัน */
export async function unsendMessage(who: Who, b: Booking, message_id: number): Promise<Message> {
  const m = await getMessage(message_id);
  if (!m || m.booking_id !== b.id) throw new BookingError("ไม่พบข้อความนี้", "notfound");
  if (m.sender_type !== who.role || m.sender_id !== who.id) throw new BookingError("ยกเลิกการส่งได้เฉพาะข้อความของคุณ", "forbidden");
  if (m.blocked) throw new BookingError("ข้อความนี้ไม่ถูกส่งอยู่แล้ว", "state");
  if (m.unsent_at) return m;
  if (Date.now() - Date.parse(m.created_at) > UNSEND_MS) throw new BookingError("ยกเลิกการส่งได้ภายใน 24 ชั่วโมงหลังส่งเท่านั้น", "late");
  let r: Message;
  if (isDemo) { m.unsent_at = now(); r = m; }
  else {
    const { data, error } = await db().from("messages").update({ unsent_at: now() }).eq("id", m.id).is("unsent_at", null).select().maybeSingle();
    if (error) { console.error("unsend", error.message); throw OFF(); }
    r = (data as Message) ?? { ...m, unsent_at: now() };
  }
  await quietNotice(b, m, true).catch((e) => console.error("unsend notice", e));
  return r;
}

/** ลบข้อความ (เฉพาะฉัน) — ข้อความใดก็ได้ในแชทนี้ อีกฝ่ายยังเห็นตามเดิม */
export async function hideMessage(who: Who, b: Booking, message_id: number) {
  const m = await getMessage(message_id);
  if (!m || m.booking_id !== b.id || (m.blocked && m.sender_type !== who.role)) throw new BookingError("ไม่พบข้อความนี้", "notfound");
  if (isDemo) { if (!demo.mh.some((x) => x.user_type === who.role && x.user_id === who.id && x.message_id === m.id)) demo.mh.push({ user_type: who.role, user_id: who.id, message_id: m.id, created_at: now() }); }
  else {
    const { error } = await db().from("message_hides").upsert({ user_type: who.role, user_id: who.id, message_id: m.id }, { onConflict: "user_type,user_id,message_id", ignoreDuplicates: true });
    if (error) { console.error("hide msg", error.message); throw OFF(); }
  }
  if (m.sender_type !== who.role && m.sender_type !== "system") await quietNotice(b, m, false).catch(() => {});
}

async function saveChatHide(who: Who, b: Booking, patch: Pick<ChatHide, "mode" | "upto_id" | "cleared_upto">) {
  if (isDemo) {
    const cur = demo.ch.find((x) => x.user_type === who.role && x.user_id === who.id && x.booking_id === b.id);
    if (cur) Object.assign(cur, patch, { created_at: now() });
    else demo.ch.push({ user_type: who.role, user_id: who.id, booking_id: b.id, ...patch, created_at: now() });
    return;
  }
  const { error } = await db().from("chat_hides").upsert({ user_type: who.role, user_id: who.id, booking_id: b.id, ...patch, created_at: now() }, { onConflict: "user_type,user_id,booking_id" });
  if (error) { console.error("chat hide", error.message); throw OFF(); }
}
/** ซ่อนแชท — หายจากรายการของฉัน · มีข้อความใหม่ = กลับมาเอง */
export async function hideChat(who: Who, b: Booking) {
  const cur = await chatHide(who, b.id);
  await saveChatHide(who, b, { mode: "hide", upto_id: await maxId(b.id), cleared_upto: cur?.cleared_upto ?? null });
  await readChatNotices(who, b).catch(() => {});
}
/** เลิกซ่อน — กลับมาในรายการ (ประวัติที่ลบกล่องแชทไปแล้วยังไม่แสดง) */
export async function unhideChat(who: Who, b: Booking) {
  const cur = await chatHide(who, b.id);
  if (!cur) return;
  await saveChatHide(who, b, { mode: cur.mode, upto_id: null, cleared_upto: cur.cleared_upto });
}
/** ลบกล่องแชท (เฉพาะฉัน) — หายจากรายการ + ล้างประวัติฝั่งฉันถึงตอนนี้ · นัดที่ยังไม่จบทำไม่ได้ (ซ่อนได้อย่างเดียว) */
export async function deleteChatBox(who: Who, b: Booking) {
  if (CHAT_ACTIVE.includes(b.status)) throw new BookingError("นัดนี้ยังไม่จบ ลบกล่องแชทไม่ได้ · ซ่อนแชทได้แทน", "state");
  const upto = await maxId(b.id);
  await saveChatHide(who, b, { mode: "delete", upto_id: upto, cleared_upto: upto });
  await readChatNotices(who, b).catch(() => {});
}

/** สถานะในรายการแชทของฉัน: hidden = ยังไม่มีข้อความใหม่หลังซ่อน/ลบกล่อง (ยังไม่รัน SQL = ไม่มีอะไรซ่อน) */
export async function chatListState(who: Who, booking_ids: string[]): Promise<Map<string, { hidden: boolean; mode: ChatHide["mode"] }>> {
  const out = new Map<string, { hidden: boolean; mode: ChatHide["mode"] }>();
  if (!booking_ids.length) return out;
  let rows: ChatHide[];
  if (isDemo) rows = demo.ch.filter((x) => x.user_type === who.role && x.user_id === who.id && booking_ids.includes(x.booking_id));
  else {
    const { data, error } = await db().from("chat_hides").select().eq("user_type", who.role).eq("user_id", who.id).in("booking_id", booking_ids.slice(0, 300));
    if (error) return out;
    rows = (data ?? []) as ChatHide[];
  }
  for (const h of rows) {
    if (h.upto_id === null || h.upto_id === undefined) { out.set(h.booking_id, { hidden: false, mode: h.mode }); continue; }
    // มีข้อความใหม่ที่ฉันเห็นได้ (ไม่ถูกกันจากอีกฝ่าย · ไม่ถูกยกเลิกการส่ง) หลังซ่อน → แชทกลับมา
    let fresh: boolean;
    if (isDemo) fresh = demoMsgs().some((m) => m.booking_id === h.booking_id && m.id > h.upto_id! && !m.unsent_at && (!m.blocked || m.sender_type === who.role));
    else {
      const { data, error } = await db().from("messages").select("id").eq("booking_id", h.booking_id).gt("id", h.upto_id).is("unsent_at", null).or(`blocked.eq.false,sender_type.eq.${who.role}`).limit(1);
      fresh = !error && !!data?.length;
    }
    out.set(h.booking_id, { hidden: !fresh, mode: h.mode });
  }
  return out;
}

/** ป้ายสำหรับทีมงาน: ข้อความไหนถูกยกเลิกการส่ง/ลบฝั่งใคร + สถานะซ่อน/ลบกล่องแชทของแต่ละฝ่าย */
export async function adminChatTags(booking_id: string, ms: Message[]): Promise<{ tags: Map<number, string[]>; boxes: string[] }> {
  const tags = new Map<number, string[]>();
  const add = (id: number, s: string) => tags.set(id, [...(tags.get(id) ?? []), s]);
  const t = (s: string) => new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  for (const m of ms) if (m.unsent_at) add(m.id, `ยกเลิกการส่ง · ${t(m.unsent_at)}`);
  const ids = ms.map((m) => m.id);
  let mh: MsgHide[] = [], ch: ChatHide[] = [];
  if (isDemo) { mh = demo.mh.filter((x) => ids.includes(x.message_id)); ch = demo.ch.filter((x) => x.booking_id === booking_id); }
  else {
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await db().from("message_hides").select().in("message_id", ids.slice(i, i + 200));
      if (error) break;
      mh.push(...((data ?? []) as MsgHide[]));
    }
    const r = await db().from("chat_hides").select().eq("booking_id", booking_id);
    if (!r.error) ch = (r.data ?? []) as ChatHide[];
  }
  for (const x of mh) add(Number(x.message_id), `ลบฝั่ง${WHO_TH[x.user_type]} · ${t(x.created_at)}`);
  const boxes: string[] = [];
  for (const h of ch) {
    if (h.cleared_upto) for (const m of ms) if (m.id <= h.cleared_upto) add(m.id, `ลบฝั่ง${WHO_TH[h.user_type]} (ลบกล่องแชท)`);
    boxes.push(`${WHO_TH[h.user_type]}${h.mode === "delete" ? "ลบกล่องแชท" : "ซ่อนแชท"} · ${t(h.created_at)}${h.upto_id === null ? " · เลิกซ่อนแล้ว" : ""}`);
  }
  return { tags, boxes };
}

/** ทดสอบเท่านั้น (โหมดสาธิต + ไม่ใช่ production): ทำให้ข้อความเก่าลง N ชม. — e2e ทดสอบกติกายกเลิกการส่งภายใน 24 ชม. */
export function demoAgeMessage(id: number, hours: number): boolean {
  if (!isDemo || process.env.VERCEL_ENV || process.env.NODE_ENV === "production") return false;
  const m = demoMsgs().find((x) => x.id === id);
  if (!m) return false;
  m.created_at = new Date(Date.parse(m.created_at) - Math.round(hours * 3600_000)).toISOString();
  return true;
}
