import "server-only";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getBooking, notify, type Booking } from "@/lib/bookings";
import { ptBlocks } from "@/lib/bookings/blocks";
import { currentParttime } from "@/lib/bookings/auth";
import { currentCustomer } from "@/lib/customer/auth";
import { getProfile } from "@/lib/customer/profile";
import { publicId } from "@/lib/home/live";
import { limited } from "@/lib/rate-limit";
import { sendPush } from "@/lib/push";
import { CALL_RULES, type CallSide, type CallStatus, type CallView } from "./rules";

// โทรผ่านแอป (WebRTC) ระยะที่ 1 — supabase/booking/0010_calls.sql · docs/plan/in-app-calls.md
// - เฉพาะลูกค้าเจ้าของนัด ↔ Part-Time ของนัดนั้น · นัด "ตอบรับแล้ว"/"เช็กอินแล้ว" · ตั้งแต่ 2 ชม. ก่อนนัดจนจบนัด
// - ส่งสัญญาณผ่าน API เรา (ถามทุก 1 วิระหว่างต่อสาย) · ICE แบบไม่ทีละชิ้น: แต่ละฝั่งส่ง SDP ครบชุดครั้งเดียว
// - เสียงไม่ผ่านเซิร์ฟเวอร์เรา · SDP ถูกลบเมื่อจบสาย · เก็บแค่เวลา/ความยาว/ผลสาย
export { CALL_RULES } from "./rules";
export type Who = { side: CallSide; id: string; name: string };
export type Call = {
  id: string; booking_id: string; caller_type: CallSide; caller_id: string; callee_type: CallSide; callee_id: string; caller_name: string | null;
  status: CallStatus; end_reason: string | null; offer: string | null; answer: string | null;
  created_at: string; answered_at: string | null; ended_at: string | null; duration_s: number | null;
};
export class CallError extends Error { constructor(msg: string, public code = "bad", public status = 409) { super(msg); } }

const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoTools = () => isDemo && !process.env.VERCEL_ENV && process.env.NODE_ENV !== "production";
let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
const g = globalThis as unknown as { __mbCalls?: Call[] };
const demo = (g.__mbCalls ??= []);
const LIVE: CallStatus[] = ["ringing", "active"];
const now = () => new Date().toISOString();

// ── ตัวตน ──
/** ผู้ใช้ปัจจุบันในนัดนี้: ลูกค้า (cookie) หรือ Part-Time (mb + t / cookie mb_resume) · as = เลือกฝั่งเมื่อเครื่องเดียวมีทั้งสองแบบ */
export async function callActor(b: Booking, o: { as?: string | null; mb?: string | null; t?: string | null }): Promise<Who | null> {
  const asCustomer = async (): Promise<Who | null> => {
    const c = await currentCustomer().catch(() => null);
    return c && c.sub === b.customer_id ? { side: "customer", id: c.sub, name: b.customer_name || "ลูกค้า" } : null;
  };
  const asPt = async (): Promise<Who | null> => {
    if (!o.mb || o.mb !== b.parttime_mb) return null;
    const a = await currentParttime(o.mb, o.t).catch(() => null);
    return a && a.id === b.parttime_id ? { side: "parttime", id: a.id, name: b.parttime_nick || "เพื่อน" } : null;
  };
  if (o.as === "pt" || o.as === "parttime") return asPt();
  if (o.as === "customer") return asCustomer();
  return (await asCustomer()) ?? (await asPt());
}
/** ตัวตนสำหรับดูสายเรียกเข้า (ไม่ผูกกับนัด) */
export async function incomingActor(o: { as?: string | null; mb?: string | null; t?: string | null }): Promise<{ side: CallSide; id: string } | null> {
  if (o.as !== "customer" && o.mb) {
    const a = await currentParttime(o.mb, o.t).catch(() => null);
    if (a) return { side: "parttime", id: a.id };
    if (o.as === "pt" || o.as === "parttime") return null;
  }
  const c = await currentCustomer().catch(() => null);
  return c ? { side: "customer", id: c.sub } : null;
}
const isParty = (c: Call, w: { side: CallSide; id: string }) => (c.caller_type === w.side && c.caller_id === w.id) || (c.callee_type === w.side && c.callee_id === w.id);
const isCaller = (c: Call, w: { side: CallSide; id: string }) => c.caller_type === w.side && c.caller_id === w.id;

// ── ที่เก็บ ──
const inMemo = ((globalThis as unknown as { __mbCallIn?: Map<string, { at: number; calls: Incoming[] }> }).__mbCallIn ??= new Map());
const IN_TTL = 2000;
const forget = (c: Pick<Call, "callee_type" | "callee_id">) => { inMemo.delete(`${c.callee_type}:${c.callee_id}`); };
async function insert(c: Call): Promise<Call | null> {
  if (isDemo) {
    if (demo.some((x) => x.booking_id === c.booking_id && LIVE.includes(x.status))) return null;
    demo.unshift(c);
    forget(c);
    return c;
  }
  const { data, error } = await db().from("booking_calls").insert(c).select().single();
  if (error) { if (error.code === "23505") return null; throw error; }
  forget(c);
  return data as Call;
}
/** อัปเดตแบบมีเงื่อนไขสถานะ (กันสองฝั่งกดพร้อมกัน) · null = สถานะเปลี่ยนไปแล้ว */
async function patch(id: string, from: CallStatus[], p: Partial<Call>, extra?: (c: Call) => boolean): Promise<Call | null> {
  if (isDemo) {
    const c = demo.find((x) => x.id === id);
    if (!c || !from.includes(c.status) || (extra && !extra(c))) return null;
    Object.assign(c, p);
    forget(c);
    return c;
  }
  let q = db().from("booking_calls").update(p).eq("id", id).in("status", from);
  if (p.offer !== undefined && p.offer !== null) q = q.is("offer", null);
  if (p.answer !== undefined && p.answer !== null) q = q.is("answer", null);
  const { data, error } = await q.select().maybeSingle();
  if (error) throw error;
  if (data) forget(data as Call);
  return (data as Call) ?? null;
}
async function rawGet(id: string): Promise<Call | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  if (isDemo) return demo.find((x) => x.id === id) ?? null;
  const { data, error } = await db().from("booking_calls").select().eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Call) ?? null;
}
async function liveFor(booking_id: string): Promise<Call | null> {
  if (isDemo) return demo.find((x) => x.booking_id === booking_id && LIVE.includes(x.status)) ?? null;
  const { data, error } = await db().from("booking_calls").select().eq("booking_id", booking_id).in("status", LIVE).limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as Call) ?? null;
}

// ── จบสาย ──
async function finish(c: Call, status: "ended" | "missed" | "declined", reason: string): Promise<Call> {
  const end = Date.now();
  const dur = c.answered_at ? Math.max(0, Math.min(CALL_RULES.maxMs, end - Date.parse(c.answered_at))) : null;
  const r = await patch(c.id, LIVE, { status, end_reason: reason, ended_at: new Date(end).toISOString(), duration_s: dur == null ? null : Math.round(dur / 1000), offer: null, answer: null });
  if (!r) return (await rawGet(c.id)) ?? c;
  if (status === "missed") {
    const b = await getBooking(c.booking_id).catch(() => null);
    if (b) await notify({
      user_type: r.callee_type, user_id: r.callee_id, kind: "call_missed",
      title: `สายที่ไม่ได้รับจาก${r.caller_name ?? (r.caller_type === "customer" ? "ลูกค้า" : "เพื่อน")}`,
      body: `${b.code} · ${new Date(r.created_at).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })} น. · โทรกลับได้ในหน้านัด`,
      url: urlFor(b, r.callee_type),
    }).catch(() => {});
  }
  return r;
}
const urlFor = (b: Booking, side: CallSide) => (side === "customer" ? `/order/${b.id}` : `/join/profile/${b.parttime_mb}/jobs`);

/** ปิดสายที่เลยเวลา: เรียกนาน 45 วิ = ไม่ได้รับ · รับแล้วไม่มี answer 60 วิ = ต่อไม่สำเร็จ · คุยครบ 10 นาที = ตัดสาย */
export async function sweep(rows: Call[]): Promise<Call[]> {
  const t = Date.now();
  return Promise.all(rows.map(async (c) => {
    if (c.status === "ringing" && t - Date.parse(c.created_at) > CALL_RULES.ringMs) return finish(c, "missed", "timeout");
    if (c.status === "active" && c.answered_at) {
      const since = t - Date.parse(c.answered_at);
      if (!c.answer && since > CALL_RULES.connectMs) return finish(c, "ended", "failed");
      if (since >= CALL_RULES.maxMs) return finish(c, "ended", "max");
    }
    return c;
  }));
}
/** วางทุกสายที่ดัง/คุยอยู่ระหว่าง Part-Time กับลูกค้าคนนี้ (ทุกนัด) — ใช้ตอนบล็อก · คืนจำนวนสายที่ปิด */
export async function endCallsBetween(parttime_id: string, customer_id: string, reason = "blocked"): Promise<number> {
  let rows: Call[];
  const pair = (c: Call) => (c.caller_type === "parttime" && c.caller_id === parttime_id && c.callee_type === "customer" && c.callee_id === customer_id)
    || (c.caller_type === "customer" && c.caller_id === customer_id && c.callee_type === "parttime" && c.callee_id === parttime_id);
  if (isDemo) rows = demo.filter((c) => LIVE.includes(c.status) && pair(c));
  else {
    const q = (from: CallSide, fid: string, to: CallSide, tid: string) => db().from("booking_calls").select().in("status", LIVE).eq("caller_type", from).eq("caller_id", fid).eq("callee_type", to).eq("callee_id", tid).limit(10);
    const [x, y] = await Promise.all([q("parttime", parttime_id, "customer", customer_id), q("customer", customer_id, "parttime", parttime_id)]);
    if (x.error) throw x.error;
    if (y.error) throw y.error;
    rows = [...(x.data ?? []), ...(y.data ?? [])] as Call[];
  }
  const done = await Promise.all(rows.map((c) => finish(c, c.status === "ringing" ? "declined" : "ended", reason)));
  return done.filter((c) => c.end_reason === reason).length;
}
export async function getCall(id: string): Promise<Call | null> {
  const c = await rawGet(id);
  return c ? (await sweep([c]))[0] : null;
}

/** สาย + นัด + ผู้ใช้ปัจจุบัน (ต้องเป็นคู่สายเท่านั้น) · null = ไม่พบ/ไม่ใช่สายของคุณ */
export async function callFor(id: string, o: { as?: string | null; mb?: string | null; t?: string | null }) {
  const c = await getCall(id);
  if (!c) return null;
  const b = await getBooking(c.booking_id);
  if (!b) return null;
  const who = await callActor(b, o);
  if (!who || !isParty(c, who)) {
    // เครื่องเดียวมีทั้ง cookie ลูกค้าและโทเคน Part-Time → ลองอีกฝั่ง
    const other = o.as ? null : await callActor(b, { ...o, as: "pt" });
    if (!other || !isParty(c, other)) return null;
    return { c, b, who: other };
  }
  return { c, b, who };
}

// ── สิทธิ์ ──
const hhmm = (ms: number) => new Date(ms).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const CLOSED: Record<string, string> = {
  requested: "โทรได้หลังเพื่อนตอบรับนัดแล้ว",
  disputed: "นัดนี้มีเรื่องแจ้งปัญหา · ติดต่อทีมงานแทน",
  cancelled: "นัดนี้ยกเลิกแล้ว", cancel_requested: "นัดนี้กำลังขอยกเลิก", declined: "นัดนี้ถูกปฏิเสธแล้ว", expired: "นัดนี้หมดเวลาตอบรับแล้ว",
  refunded: "นัดนี้ปิดแล้ว", completed: "นัดนี้จบแล้ว",
};
export type CanCall = { ok: boolean; reason: string | null; code: string | null; live_id?: string | null; opens_at?: string | null };
/** เช็กกติกาทั้งหมด (ยกเว้นตัวนับความถี่ ซึ่งนับตอนเปิดสายจริง) */
export async function canCall(b: Booking | string, who: { side: CallSide; id: string } | null): Promise<CanCall> {
  const bk = typeof b === "string" ? await getBooking(b) : b;
  const no = (code: string, reason: string, x: Partial<CanCall> = {}): CanCall => ({ ok: false, code, reason, ...x });
  if (!bk) return no("notfound", "ไม่พบนัดนี้");
  if (!who || !((who.side === "customer" && who.id === bk.customer_id) || (who.side === "parttime" && who.id === bk.parttime_id))) return no("forbidden", "โทรได้เฉพาะลูกค้าและเพื่อนของนัดนี้");
  if (!CALL_RULES.statuses.includes(bk.status)) return no("status", CLOSED[bk.status] ?? "นัดนี้โทรไม่ได้");
  const start = Date.parse(bk.starts_at), opens = start - CALL_RULES.beforeMs, ends = start + bk.hours * 3600_000, t = Date.now();
  if (t < opens) return no("early", `โทรได้ตั้งแต่ ${hhmm(opens)} น. (2 ชม. ก่อนนัด)`, { opens_at: new Date(opens).toISOString() });
  if (t > ends) return no("late", "เลยเวลานัดแล้ว · คุยต่อในแชทได้");
  const prof = await getProfile(bk.customer_id, bk.customer_email ?? "").catch(() => null);
  if (prof?.blocked?.includes(publicId(bk.parttime_mb))) return no("blocked", who.side === "customer" ? "คุณบล็อกเพื่อนคนนี้ไว้ · ยกเลิกการบล็อกก่อนโทร" : "โทรหาลูกค้าคนนี้ไม่ได้");
  // Part-Time บล็อกลูกค้าคนนี้ = โทรไม่ได้ทั้งสองทาง
  if (await ptBlocks(bk.parttime_id, bk.customer_id)) return no("blocked", who.side === "customer" ? "เพื่อนคนนี้ไม่รับสายจากบัญชีของคุณ" : "คุณบล็อกลูกค้านี้ไว้ · ยกเลิกบล็อกได้ที่ตั้งค่า");
  const live = await liveFor(bk.id).then((c) => (c ? sweep([c]).then((r) => r[0]) : null));
  if (live && LIVE.includes(live.status)) return no("busy", "มีสายของนัดนี้ที่ยังไม่จบ", { live_id: live.id });
  return { ok: true, reason: null, code: null };
}

// ── เปิดสาย / ส่งสัญญาณ / รับ / ปฏิเสธ / วาง ──
export async function startCall(b: Booking, who: Who): Promise<Call> {
  const ok = await canCall(b, who);
  if (!ok.ok) throw new CallError(ok.reason!, ok.code!, ok.code === "forbidden" ? 403 : 409);
  if (await limited(`call:${b.id}`, CALL_RULES.startsPerHour, 3600_000)) throw new CallError("โทรบ่อยเกินไป · ลองใหม่ภายหลังหรือคุยในแชท", "rate", 429);
  const toCustomer = who.side === "parttime";
  const c: Call = {
    id: randomUUID(), booking_id: b.id, caller_type: who.side, caller_id: who.id,
    callee_type: toCustomer ? "customer" : "parttime", callee_id: toCustomer ? b.customer_id : b.parttime_id, caller_name: who.name,
    status: "ringing", end_reason: null, offer: null, answer: null, created_at: now(), answered_at: null, ended_at: null, duration_s: null,
  };
  const r = await insert(c);
  if (!r) throw new CallError("มีสายของนัดนี้ที่ยังไม่จบ", "busy");
  // สายเรียกเข้า: web push อย่างเดียว (ไม่ลงกล่องแจ้งเตือน — ถ้าไม่รับจะได้แจ้ง "สายที่ไม่ได้รับ" แทน)
  void sendPush(r.callee_type, r.callee_id, { title: `สายเรียกเข้าจาก${who.name}`, body: `${b.code} · แตะเพื่อเปิดแอปและรับสาย`, url: urlFor(b, r.callee_type), tag: `call:${r.id}` });
  return r;
}
const sdpOk = (s: unknown): s is string => typeof s === "string" && s.length > 0 && s.length <= CALL_RULES.maxSdp;

/** ส่ง SDP ครบชุดครั้งเดียวต่อฝั่ง: ผู้โทรส่ง offer · ผู้รับส่ง answer (หลังรับสาย) */
export async function postSignal(c: Call, who: { side: CallSide; id: string }, kind: string, sdp: unknown): Promise<Call> {
  if (!isParty(c, who)) throw new CallError("ไม่ใช่สายของคุณ", "forbidden", 403);
  if (!sdpOk(sdp)) throw new CallError("ข้อมูลเชื่อมต่อไม่ถูกต้อง", "sdp", 400);
  if (kind === "offer") {
    if (!isCaller(c, who)) throw new CallError("ผู้รับสายส่ง offer ไม่ได้", "role", 403);
    const r = await patch(c.id, LIVE, { offer: sdp }, (x) => !x.offer);
    if (!r) throw new CallError(c.offer ? "ส่งข้อมูลเชื่อมต่อไปแล้ว" : "สายนี้จบแล้ว", "state");
    return r;
  }
  if (kind === "answer") {
    if (isCaller(c, who)) throw new CallError("ผู้โทรส่ง answer ไม่ได้", "role", 403);
    const r = await patch(c.id, ["active"], { answer: sdp }, (x) => !x.answer);
    if (!r) throw new CallError(c.status !== "active" ? "ต้องรับสายก่อน" : "ส่งข้อมูลเชื่อมต่อไปแล้ว", "state");
    return r;
  }
  throw new CallError("ชนิดข้อมูลไม่ถูกต้อง", "kind", 400);
}
export async function accept(c: Call, who: { side: CallSide; id: string }, answer?: unknown): Promise<Call> {
  if (!isParty(c, who) || isCaller(c, who)) throw new CallError("รับสายนี้ไม่ได้", "forbidden", 403);
  // บล็อกระหว่างสายกำลังดัง → ปิดสาย
  const bk = await getBooking(c.booking_id).catch(() => null);
  if (bk && (await ptBlocks(bk.parttime_id, bk.customer_id))) { await finish(c, "declined", "blocked"); throw new CallError("รับสายนี้ไม่ได้ (บล็อก)", "blocked"); }
  const r = await patch(c.id, ["ringing"], { status: "active", answered_at: now() });
  if (!r) throw new CallError(c.status === "active" ? "รับสายไปแล้ว" : "สายนี้จบแล้ว", "state");
  return answer != null ? postSignal(r, who, "answer", answer) : r;
}
export async function decline(c: Call, who: { side: CallSide; id: string }): Promise<Call> {
  if (!isParty(c, who) || isCaller(c, who)) throw new CallError("ปฏิเสธสายนี้ไม่ได้", "forbidden", 403);
  if (c.status !== "ringing") return c;
  return finish(c, "declined", "declined");
}
/** วางสาย: ผู้โทรวางก่อนอีกฝั่งรับ = สายที่ไม่ได้รับ (แจ้งอีกฝั่ง) · คุยอยู่ = จบสาย + บันทึกความยาว */
export async function hangup(c: Call, who: { side: CallSide; id: string }, reason?: string): Promise<Call> {
  if (!isParty(c, who)) throw new CallError("ไม่ใช่สายของคุณ", "forbidden", 403);
  if (!LIVE.includes(c.status)) return c;
  if (c.status === "ringing") return isCaller(c, who) ? finish(c, "missed", "cancelled") : finish(c, "declined", "declined");
  const r = reason === "failed" || reason === "max" ? reason : isCaller(c, who) ? "caller" : "callee";
  return finish(c, "ended", r);
}

// ── มุมมอง ──
export function viewFor(c: Call, who: { side: CallSide; id: string }, b?: Booking | null): CallView {
  const caller = isCaller(c, who);
  const peer = caller ? (c.callee_type === "customer" ? b?.customer_name || "ลูกค้า" : b?.parttime_nick || "เพื่อน") : c.caller_name || (c.caller_type === "customer" ? "ลูกค้า" : "เพื่อน");
  return {
    id: c.id, booking_id: c.booking_id, status: c.status, end_reason: c.end_reason, me: caller ? "caller" : "callee", peer_name: peer,
    // ผู้รับเห็น offer · ผู้โทรเห็น answer (ไม่ส่งของตัวเองกลับ)
    offer: caller ? null : c.offer, answer: caller ? c.answer : null,
    created_at: c.created_at, answered_at: c.answered_at, ended_at: c.ended_at, duration_s: c.duration_s,
    ring_ends_at: new Date(Date.parse(c.created_at) + CALL_RULES.ringMs).toISOString(),
    max_ends_at: c.answered_at ? new Date(Date.parse(c.answered_at) + CALL_RULES.maxMs).toISOString() : null,
  };
}

export type Incoming = { id: string; booking_id: string; caller_name: string; code: string | null; ring_ends_at: string };
/** สายเรียกเข้าที่ยังดังอยู่ของผู้ใช้นี้ (หน้าจอถามทุก 4 วิ) · จำผล 2 วิ ล้างเมื่อสายของผู้ใช้นั้นเปลี่ยน */
export async function incomingFor(side: CallSide, id: string): Promise<Incoming[]> {
  const key = `${side}:${id}`, hit = inMemo.get(key);
  if (hit && Date.now() - hit.at < IN_TTL) return hit.calls;
  const calls = await readIncoming(side, id);
  inMemo.set(key, { at: Date.now(), calls });
  if (inMemo.size > 5000) for (const [k, v] of inMemo) if (Date.now() - v.at > IN_TTL) inMemo.delete(k);
  return calls;
}
async function readIncoming(side: CallSide, id: string): Promise<Incoming[]> {
  let rows: Call[];
  if (isDemo) rows = demo.filter((c) => c.callee_type === side && c.callee_id === id && c.status === "ringing").slice(0, 3);
  else {
    const { data, error } = await db().from("booking_calls").select().eq("callee_type", side).eq("callee_id", id).eq("status", "ringing").limit(3);
    if (error) throw error;
    rows = (data ?? []) as Call[];
  }
  if (!rows.length) return [];
  const live = (await sweep(rows)).filter((c) => c.status === "ringing");
  return Promise.all(live.map(async (c) => {
    const b = await getBooking(c.booking_id).catch(() => null);
    return { id: c.id, booking_id: c.booking_id, caller_name: c.caller_name || "สายเรียกเข้า", code: b?.code ?? null, ring_ends_at: new Date(Date.parse(c.created_at) + CALL_RULES.ringMs).toISOString() };
  }));
}

/** ประวัติการโทรของนัด (หลังบ้าน) — ไม่ส่ง SDP */
export async function listCallsForBooking(booking_id: string) {
  let rows: Call[];
  if (isDemo) rows = demo.filter((c) => c.booking_id === booking_id);
  else {
    const { data, error } = await db().from("booking_calls").select("id,booking_id,caller_type,caller_id,callee_type,callee_id,caller_name,status,end_reason,created_at,answered_at,ended_at,duration_s").eq("booking_id", booking_id).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    rows = (data ?? []) as Call[];
  }
  return (await sweep(rows)).map(({ offer: _o, answer: _a, ...c }) => c);
}

// ── TURN ──
type Ice = { urls: string | string[]; username?: string; credential?: string };
const STUN: Ice = { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] };
/** STUN เสมอ + TURN ชั่วคราวจาก Cloudflare (อายุ 10 นาที) เมื่อตั้ง env · ดึงฝั่งเซิร์ฟเวอร์เท่านั้น ไม่ส่ง token ออก */
export async function iceServers(): Promise<{ iceServers: Ice[]; turn: boolean }> {
  const kid = process.env.CLOUDFLARE_TURN_KEY_ID, tok = process.env.CLOUDFLARE_TURN_KEY_API_TOKEN;
  if (!kid || !tok) return { iceServers: [STUN], turn: false };
  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(kid)}/credentials/generate`, {
      method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, body: JSON.stringify({ ttl: 600 }), cache: "no-store", signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) throw new Error(`turn ${r.status}`);
    const j = (await r.json()) as { iceServers?: Ice | Ice[] };
    const list = (Array.isArray(j.iceServers) ? j.iceServers : j.iceServers ? [j.iceServers] : [])
      // พอร์ต 53 ถูกบล็อกในเบราว์เซอร์หลายตัว → ตัดทิ้ง (คำแนะนำของ Cloudflare)
      .map((s) => ({ ...s, urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u)) }))
      .filter((s) => s.urls.length);
    return { iceServers: [STUN, ...list], turn: list.some((s) => s.urls.some((u) => u.startsWith("turn"))) };
  } catch (e) {
    console.error("turn creds", (e as Error).message);
    return { iceServers: [STUN], turn: false };
  }
}

/** ทดสอบเท่านั้น (โหมดสาธิต + ไม่ใช่ production): ย้อนเวลาสายนี้ N วินาที — ให้ e2e ทดสอบหมดเวลาเรียก/ครบ 10 นาที */
export function demoAge(id: string, seconds: number): Call | null {
  if (!demoTools()) return null;
  const c = demo.find((x) => x.id === id);
  if (!c) return null;
  const back = (iso: string | null) => (iso ? new Date(Date.parse(iso) - Math.round(seconds) * 1000).toISOString() : iso);
  c.created_at = back(c.created_at)!; c.answered_at = back(c.answered_at);
  return c;
}
export const demoToolsOn = demoTools;
