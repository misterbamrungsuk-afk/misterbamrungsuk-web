import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PLATFORM, WalletError, balances } from "@/lib/wallet";
import { extraOf } from "@/lib/join/store";
import { getCustomerRules } from "./rules";
import { BookingError, addEvent, getBooking, getById, isDemo, listForParttime, moveBooking, notify, outsideWork, sendMessage, type Booking } from "./index";

// คำขอเปลี่ยนแปลงนัด (supabase/booking/0011_changes.sql)
// · เปลี่ยนเวลา (reschedule): ลูกค้าขอเวลาใหม่ของนัดที่ยืนยันแล้วและยังไม่เริ่ม → เพื่อนรับ = เวลานัดเปลี่ยน / ไม่รับหรือหมดเวลา = นัดเดิม · ไม่มีเงินเปลี่ยน · 1 ครั้งต่อการจอง
// · ต่อเวลา (extend): ระหว่างนัด (เช็กอินแล้ว) ลูกค้าขอ +1 ชม. → เพื่อนรับ = ตัดค่าชั่วโมงจากกระเป๋าลูกค้าเข้า escrow (idem) + เพิ่มค่าบริการ/ยอดรวมของนัด
//   ตอนจบงาน split() แบ่งจากค่าบริการใหม่ → เพื่อนได้ส่วนแบ่งของชั่วโมงที่ต่อตามปกติ
export type ChangeKind = "reschedule" | "extend";
/** cancelled = ลูกค้ายกเลิกคำขอเอง (0013 เพิ่มในเงื่อนไขตาราง · ยังไม่รัน = เก็บเป็น declined + decided_by ลูกค้า แล้วแปลงตอนอ่าน) */
export type ChangeStatus = "pending" | "accepted" | "declined" | "expired" | "failed" | "cancelled";
export type Change = {
  id: string; booking_id: string; kind: ChangeKind; status: ChangeStatus;
  old_starts_at: string | null; new_starts_at: string | null; hours: number; amount_satang: number;
  reason: string | null; expires_at: string; created_at: string; decided_at: string | null; decided_by: string | null;
};

let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
const g = globalThis as unknown as { __mbBookChanges?: Change[] };
const demo: Change[] = (g.__mbBookChanges ??= []);
const now = () => new Date().toISOString();
const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const when = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const ptJobs = (b: Booking) => `/join/profile/${b.parttime_mb}/jobs`;
/** ยังไม่รัน migration (ไม่มีตาราง) → ข้อความชัด ไม่ใช่ 500 */
const notReady = (e: unknown) => /booking_changes|relation .* does not exist|schema cache/i.test(String((e as { message?: string })?.message ?? ""));
const READY_MSG = "ระบบเปลี่ยนเวลา/ต่อเวลายังไม่เปิดใช้งาน · ติดต่อทีมงานทาง LINE";

async function insertChange(row: Omit<Change, "id" | "created_at" | "decided_at" | "decided_by" | "status">): Promise<Change> {
  const full: Change = { ...row, id: crypto.randomUUID(), status: "pending", created_at: now(), decided_at: null, decided_by: null };
  if (isDemo) {
    if (demo.some((c) => c.booking_id === row.booking_id && c.status === "pending")) throw new BookingError("มีคำขอที่รอเพื่อนตอบอยู่แล้ว", "pending");
    demo.unshift(full); return full;
  }
  const { data, error } = await db().from("booking_changes").insert(full).select().single();
  if (error?.code === "23505") throw new BookingError("มีคำขอที่รอเพื่อนตอบอยู่แล้ว", "pending"); // booking_changes_one_pending
  if (error) { if (notReady(error)) throw new BookingError(READY_MSG, "not_ready"); throw error; }
  return data as Change;
}
/** เปลี่ยนสถานะคำขอแบบมีเงื่อนไข (กันกดซ้อน) — null = สถานะเปลี่ยนไปแล้ว */
async function patchChange(id: string, from: ChangeStatus[], patch: Partial<Change>): Promise<Change | null> {
  if (isDemo) { const c = demo.find((x) => x.id === id); if (!c || !from.includes(c.status)) return null; return Object.assign(c, patch); }
  const { data, error } = await db().from("booking_changes").update(patch).eq("id", id).in("status", from).select().maybeSingle();
  if (error) throw error;
  return (data as Change) ?? null;
}

/** คำขอของการจอง (ใหม่ → เก่า) · คำขอที่เลยเวลาตอบ = หมดเวลา (ทำตอนอ่าน ไม่ต้องพึ่ง cron) */
export async function listChanges(bookingIds: string[]): Promise<Change[]> {
  if (!bookingIds.length) return [];
  let rows: Change[];
  if (isDemo) rows = demo.filter((c) => bookingIds.includes(c.booking_id));
  else {
    const { data, error } = await db().from("booking_changes").select().in("booking_id", bookingIds.slice(0, 200)).order("created_at", { ascending: false });
    if (error) { if (notReady(error)) return []; throw error; }
    rows = (data ?? []) as Change[];
  }
  for (const c of rows) if (c.status === "declined" && c.decided_by?.startsWith("customer:")) c.status = "cancelled";
  for (const c of rows) {
    if (c.status !== "pending" || Date.parse(c.expires_at) > Date.now()) continue;
    const r = await patchChange(c.id, ["pending"], { status: "expired", decided_at: now(), decided_by: "system" }).catch(() => null);
    if (!r) continue;
    Object.assign(c, r);
    const b = await getBooking(c.booking_id).catch(() => null);
    if (!b) continue;
    await addEvent(b.id, `${c.kind}_expired`, "system", { change: c.id }).catch(() => {});
    await notify({ user_type: "customer", user_id: b.customer_id, kind: `booking_${c.kind}`, title: c.kind === "reschedule" ? `คำขอเปลี่ยนเวลา ${b.code} หมดเวลา` : `คำขอต่อเวลา ${b.code} หมดเวลา`, body: c.kind === "reschedule" ? `เพื่อนไม่ได้ตอบ · นัดยังเป็นเวลาเดิม ${when(b.starts_at)}` : "เพื่อนไม่ได้ตอบ · ไม่มีการตัดเงิน", url: `/order/${b.id}` }).catch(() => {});
  }
  return rows;
}
const pendingOf = (rows: Change[], kind?: ChangeKind) => rows.find((c) => c.status === "pending" && (!kind || c.kind === kind)) ?? null;
/** ชั่วโมงที่ต่อไปแล้ว + ยอดที่ตัดเพิ่มแล้ว (นับจากคำขอที่เพื่อนรับ — ไม่พึ่งคอลัมน์ extra_hours ที่อาจยังไม่มี) */
const extendedOf = (rows: Change[]) => rows.filter((c) => c.kind === "extend" && c.status === "accepted").reduce((t, c) => ({ hours: t.hours + c.hours, amount: t.amount + c.amount_satang }), { hours: 0, amount: 0 });
/** ค่าบริการต่อชั่วโมงของนัดนี้ (ค่าบริการเดิมก่อนต่อเวลา ÷ ชม. เดิม) — ไม่รวมค่าห้อง */
const hourlyOf = (b: Booking, rows: Change[]) => Math.round((b.price_satang - extendedOf(rows).amount) / b.hours);

/** เวลาใหม่ (startMs, ชม. hours) ว่างไหม: เพื่อนพักรับงาน · ตารางรับงาน · ชนนัดอื่น (ไม่นับนัดนี้) — ผิด = BookingError */
async function checkSlot(b: Booking, startMs: number, hours: number, opts: { schedule: boolean }) {
  const a = await getById(b.parttime_id).catch(() => null);
  if (!a) throw new BookingError("ไม่พบข้อมูลเพื่อน", "notfound");
  if (extraOf(a).work?.paused) throw new BookingError("เพื่อนพักรับงานชั่วคราว · เปลี่ยนเวลาไม่ได้ตอนนี้", "paused");
  if (opts.schedule) { const why = outsideWork(a, startMs); if (why) throw new BookingError(why, "hours_off"); }
  const clash = (await listForParttime(b.parttime_id)).some((x) => x.id !== b.id && ["requested", "accepted", "checked_in"].includes(x.status)
    && Math.abs(Date.parse(x.starts_at) - startMs) < Math.max(x.hours + (x.extra_hours ?? 0), hours) * 3600_000);
  if (clash) throw new BookingError("ช่วงเวลานี้เพื่อนมีนัดอื่นแล้ว ลองเลือกเวลาอื่น", "clash");
}

/** สถานะที่หน้าการจองใช้: ปุ่มเปลี่ยนเวลา/ต่อเวลา กดได้ไหม + เหตุผล + ราคาต่อชั่วโมง */
export async function changeInfo(b: Booking) {
  const [rows, rules] = await Promise.all([listChanges([b.id]).catch(() => [] as Change[]), getCustomerRules()]);
  const ext = extendedOf(rows), pending = pendingOf(rows);
  const used = rows.some((c) => c.kind === "reschedule" && c.status !== "cancelled"); // ยกเลิกคำขอเอง = ยังไม่ใช้สิทธิ์
  const left = Date.parse(b.starts_at) - Date.now();
  const reschedule = b.status !== "accepted" ? null
    : used ? "เปลี่ยนเวลาได้ 1 ครั้งต่อการจอง"
    : left < rules.rescheduleMinHours * 3600_000 ? `เปลี่ยนเวลาได้ก่อนเวลานัดอย่างน้อย ${rules.rescheduleMinHours} ชม.`
    : pending ? "มีคำขอที่รอเพื่อนตอบอยู่" : "";
  const extend = b.status !== "checked_in" ? null
    : b.pt_done_at ? "เพื่อนแจ้งจบงานแล้ว"
    : ext.hours >= rules.extendMaxHours ? `ต่อเวลาได้รวมไม่เกิน ${rules.extendMaxHours} ชม.`
    : pending ? "มีคำขอที่รอเพื่อนตอบอยู่" : "";
  return {
    changes: rows.slice(0, 10), pending, extra_hours: ext.hours, hourly_satang: hourlyOf(b, rows),
    // "" = กดได้ · ข้อความ = เหตุผลที่กดไม่ได้ · null = ไม่แสดงปุ่ม
    can_reschedule: reschedule, can_extend: extend, rules: { rescheduleMinHours: rules.rescheduleMinHours, rescheduleWaitHours: rules.rescheduleWaitHours, extendMaxHours: rules.extendMaxHours },
  };
}

/** แนบคำขอที่รอตอบ + ชม.ที่ต่อแล้ว ให้รายการงานของ Part-Time */
export async function withChanges<T extends Booking>(rows: T[]): Promise<(T & { pending_change: Change | null; extra_hours: number })[]> {
  const live = rows.filter((b) => ["accepted", "checked_in", "completed", "disputed"].includes(b.status)).map((b) => b.id);
  const all = await listChanges(live).catch(() => [] as Change[]);
  return rows.map((b) => { const mine = all.filter((c) => c.booking_id === b.id); return { ...b, pending_change: pendingOf(mine), extra_hours: Math.max(b.extra_hours ?? 0, extendedOf(mine).hours) }; });
}

// ── เปลี่ยนเวลา ──
export async function requestReschedule(id: string, customer_id: string, startsAt: string, reason = ""): Promise<Change> {
  const b = await getBooking(id);
  if (!b || b.customer_id !== customer_id) throw new BookingError("ไม่พบการจอง", "notfound");
  const info = await changeInfo(b);
  if (info.can_reschedule === null) throw new BookingError("เปลี่ยนเวลาได้เฉพาะนัดที่เพื่อนยืนยันแล้วและยังไม่เริ่ม", "state");
  if (info.can_reschedule) throw new BookingError(info.can_reschedule, info.can_reschedule.includes("ก่อนเวลานัด") ? "too_late" : "limit");
  const start = Date.parse(startsAt);
  if (!Number.isFinite(start) || start < Date.now() + 60 * 60_000 || start > Date.now() + 60 * 86400_000) throw new BookingError("เลือกเวลาใหม่ล่วงหน้าอย่างน้อย 1 ชม. และไม่เกิน 60 วัน", "time");
  if (Math.abs(start - Date.parse(b.starts_at)) < 15 * 60_000) throw new BookingError("เวลาใหม่ต้องต่างจากเวลาเดิมอย่างน้อย 15 นาที", "time");
  const hours = b.hours + info.extra_hours;
  await checkSlot(b, start, hours, { schedule: true });
  const rules = await getCustomerRules();
  const expires = Math.min(Date.now() + rules.rescheduleWaitHours * 3600_000, Date.parse(b.starts_at));
  const c = await insertChange({ booking_id: b.id, kind: "reschedule", old_starts_at: b.starts_at, new_starts_at: new Date(start).toISOString(), hours: 0, amount_satang: 0, reason: reason.trim().slice(0, 200) || null, expires_at: new Date(expires).toISOString() });
  await addEvent(b.id, "reschedule_requested", `customer:${customer_id}`, { change: c.id, from: b.starts_at, to: c.new_starts_at });
  await notify({ user_type: "parttime", user_id: b.parttime_id, kind: "booking_reschedule", title: `ลูกค้าขอเปลี่ยนเวลา ${b.code}`, body: `${when(b.starts_at)} → ${when(c.new_starts_at!)} · ตอบก่อน ${when(c.expires_at)}`, url: ptJobs(b) });
  return c;
}

export async function respondReschedule(id: string, parttime_id: string, accept: boolean, reason = ""): Promise<Booking> {
  const b = await getBooking(id);
  if (!b || b.parttime_id !== parttime_id) throw new BookingError("ไม่พบงานนี้", "notfound");
  const c = pendingOf(await listChanges([b.id]), "reschedule");
  if (!c) throw new BookingError("ไม่มีคำขอเปลี่ยนเวลาที่รอตอบ (อาจหมดเวลาแล้ว)", "state");
  const actor = `parttime:${parttime_id}`;
  if (accept && b.status !== "accepted") {
    await patchChange(c.id, ["pending"], { status: "failed", reason: "นัดเปลี่ยนสถานะก่อนตอบ", decided_at: now(), decided_by: actor }).catch(() => null);
    throw new BookingError("นัดนี้เปลี่ยนสถานะไปแล้ว · เปลี่ยนเวลาไม่ได้", "state");
  }
  if (!accept) {
    const r = await patchChange(c.id, ["pending"], { status: "declined", reason: reason.trim().slice(0, 200) || c.reason, decided_at: now(), decided_by: actor });
    if (!r) throw new BookingError("คำขอนี้ตอบไปแล้ว", "state");
    await addEvent(b.id, "reschedule_declined", actor, { change: c.id, reason: reason.slice(0, 200) || null });
    await notify({ user_type: "customer", user_id: b.customer_id, kind: "booking_reschedule", title: `${b.parttime_nick ?? "เพื่อน"} ไม่สะดวกเวลาใหม่`, body: `${b.code} · นัดยังเป็นเวลาเดิม ${when(b.starts_at)}${reason.trim() ? ` · ${reason.trim().slice(0, 80)}` : ""}`, url: `/order/${b.id}` });
    return b;
  }
  const to = c.new_starts_at!;
  // ตรวจซ้ำตอนรับ (อาจมีนัดอื่นเข้ามาระหว่างรอ) — ไม่ผ่าน = คำขอยังเปิดให้กดไม่สะดวกได้ · ไม่เทียบตารางรับงาน (เพื่อนกดรับเอง = ยืนยันว่าว่าง)
  await checkSlot(b, Date.parse(to), b.hours + (b.extra_hours ?? 0), { schedule: false });
  const claimed = await patchChange(c.id, ["pending"], { status: "accepted", decided_at: now(), decided_by: actor });
  if (!claimed) throw new BookingError("คำขอนี้ตอบไปแล้ว", "state");
  let r: Booking | null;
  try { r = await moveBooking(b.id, ["accepted"], { starts_at: to }, null); }
  catch (e) { await patchChange(c.id, ["accepted"], { status: "pending", decided_at: null, decided_by: null }).catch(() => null); throw e; }
  if (!r) { await patchChange(c.id, ["accepted"], { status: "failed", decided_at: now() }).catch(() => null); throw new BookingError("นัดนี้เปลี่ยนสถานะไปแล้ว · เปลี่ยนเวลาไม่ได้", "state"); }
  await addEvent(b.id, "rescheduled", actor, { change: c.id, from: c.old_starts_at, to });
  // นัดที่สปาพาร์ทเนอร์: ย้ายเวลาในพอร์ทัล + แจ้งสปาให้ตรวจห้องของเวลาใหม่ (พลาดไม่กระทบนัด — ทีมงานได้แจ้งเตือน)
  const spa = r.place?.spa_id ? await spaRescheduled(r, c.old_starts_at ?? b.starts_at).catch((e) => { console.error("spa reschedule", e); return null; }) : null;
  await notify({ user_type: "customer", user_id: b.customer_id, kind: "booking_reschedule", title: `${b.parttime_nick ?? "เพื่อน"} รับเวลาใหม่แล้ว`, body: `${b.code} · นัดใหม่ ${when(to)}${spa ? ` · ${r.place.spa_name ?? "สปา"} กำลังตรวจห้องของเวลาใหม่` : ""}`, url: `/order/${b.id}` });
  await sendMessage(r, "system", null, `เปลี่ยนเวลานัดเป็น ${when(to)} แล้ว (เดิม ${when(c.old_starts_at ?? b.starts_at)})`).catch(() => {});
  return r;
}

/** สปาพาร์ทเนอร์: เวลาในพอร์ทัลเปลี่ยนตามนัด · เคยยืนยันห้อง/แจ้งห้องเต็ม = กลับเป็น "รอยืนยัน" ให้สปาตอบใหม่สำหรับเวลาใหม่
 *  แจ้งสปาทางอีเมล (ถ้าตั้งอีเมลไว้) + ทีมงาน · คืน null = ไม่มีรายการในพอร์ทัลที่ย้ายได้ (จบ/ยกเลิกแล้ว หรือยังไม่ sync) */
async function spaRescheduled(b: Booking, from: string) {
  const pid = b.place.spa_id!;
  const { rescheduleSpaBooking } = await import("@/lib/partner/portal");
  const moved = await rescheduleSpaBooking(b.code, b.starts_at);
  const spa = b.place.spa_name ?? "สปา";
  if (!moved) {
    await notify({ user_type: "admin", user_id: "ops", kind: "spa_reschedule", title: `เปลี่ยนเวลานัดสปา ${b.code} · พอร์ทัลไม่ได้อัปเดต`, body: `${spa} · ${when(from)} → ${when(b.starts_at)} · แจ้งสปาเอง`, url: "/admin/orders" });
    return null;
  }
  await addEvent(b.id, "spa_rescheduled", "system", { from, to: b.starts_at, prev: moved.prev });
  const title = `นัด ${b.code} เปลี่ยนเวลา`;
  const body = `${when(from)} → ${when(b.starts_at)} · ${b.hours + (b.extra_hours ?? 0)} ชม.${moved.prev !== "pending" ? " · กรุณายืนยันห้องของเวลาใหม่อีกครั้ง" : " · กรุณายืนยันห้อง"}`;
  const p = await import("@/lib/partner/store").then((m) => m.getPartner(pid)).catch(() => null);
  const mail = await import("@/lib/email");
  if (p?.email && mail.emailEnabled()) await mail.sendEmail(mail.noticeMail(p.email, "spa_reschedule", title, body, "/partner/portal/bookings")).catch((e) => console.error("spa mail", e));
  await notify({ user_type: "admin", user_id: "ops", kind: "spa_reschedule", title: `สปา ${spa}: ${title}`, body, url: "/admin/orders" });
  // แจ้งในกล่องแจ้งเตือนพอร์ทัลสปาด้วย
  await import("@/lib/partner/notify").then((m) => m.notifySpaBooking(pid, "changed", { booking_ref: b.code, start_time: b.starts_at, hours: b.hours + (b.extra_hours ?? 0) }, `เดิม ${when(from)}`)).catch((e) => console.error("spa notice", e));
  return moved;
}

// ── ลูกค้ายกเลิกคำขอที่รอเพื่อนตอบ ──
/** ยกเลิกคำขอเปลี่ยนเวลา/ต่อเวลาของตัวเองที่ยังรอตอบ (ไม่มีเงินเปลี่ยน — ต่อเวลาตัดเงินตอนเพื่อนรับเท่านั้น)
 *  ยกเลิกคำขอเปลี่ยนเวลาแล้ว ไม่นับเป็น "ใช้สิทธิ์ 1 ครั้ง" · แจ้งเพื่อน */
export async function cancelChange(id: string, customer_id: string, kind: ChangeKind): Promise<Change> {
  const b = await getBooking(id);
  if (!b || b.customer_id !== customer_id) throw new BookingError("ไม่พบการจอง", "notfound");
  const c = pendingOf(await listChanges([b.id]), kind);
  if (!c) throw new BookingError(kind === "reschedule" ? "ไม่มีคำขอเปลี่ยนเวลาที่รอตอบ (เพื่อนอาจตอบไปแล้ว)" : "ไม่มีคำขอต่อเวลาที่รอตอบ (เพื่อนอาจตอบไปแล้ว)", "state");
  const actor = `customer:${customer_id}`;
  const stamp = { decided_at: now(), decided_by: actor, reason: "ลูกค้ายกเลิกคำขอ" };
  let r: Change | null;
  try { r = await patchChange(c.id, ["pending"], { status: "cancelled", ...stamp }); }
  catch (e) {
    // ยังไม่รัน 0013 (เงื่อนไขสถานะเดิม) → เก็บเป็น declined โดยลูกค้า (อ่านกลับเป็น cancelled)
    if ((e as { code?: string })?.code !== "23514") throw e;
    r = await patchChange(c.id, ["pending"], { status: "declined", ...stamp });
    if (r) r.status = "cancelled";
  }
  if (!r) throw new BookingError("เพื่อนตอบคำขอนี้ไปแล้ว · รีเฟรชหน้าเพื่อดูผล", "state");
  await addEvent(b.id, `${kind}_cancelled`, actor, { change: c.id });
  await notify({ user_type: "parttime", user_id: b.parttime_id, kind: `booking_${kind}`, title: kind === "reschedule" ? `ลูกค้ายกเลิกคำขอเปลี่ยนเวลา ${b.code}` : `ลูกค้ายกเลิกคำขอต่อเวลา ${b.code}`, body: kind === "reschedule" ? `นัดยังเป็นเวลาเดิม ${when(b.starts_at)} · ไม่ต้องตอบแล้ว` : "ไม่ต้องตอบแล้ว · ไม่มีการตัดเงิน", url: ptJobs(b) });
  return r;
}

/** ต่อเวลาที่เพื่อนรับ "หลัง" ลูกค้าจบนัดพร้อมกัน (จบงานใช้ยอดเดิม) — day.ts คืนเงินส่วนนี้ให้ลูกค้าแล้ว → ปิดคำขอเป็นไม่สำเร็จ
 *  ไล่จากคำขอที่รับล่าสุดจนครบยอดที่คืน */
export async function voidLateExtensions(bookingId: string, amount: number, actor: string) {
  const rows = (await listChanges([bookingId])).filter((c) => c.kind === "extend" && c.status === "accepted").sort((a, b) => String(b.decided_at).localeCompare(String(a.decided_at)));
  let left = amount;
  for (const c of rows) {
    if (left <= 0) break;
    await patchChange(c.id, ["accepted"], { status: "failed", reason: "ลูกค้าจบนัดก่อนต่อเวลา · คืนเงินแล้ว", decided_by: actor }).catch(() => null);
    left -= c.amount_satang;
  }
}

// ── ต่อเวลา ──
export async function requestExtend(id: string, customer_id: string): Promise<Change> {
  const b = await getBooking(id);
  if (!b || b.customer_id !== customer_id) throw new BookingError("ไม่พบการจอง", "notfound");
  const info = await changeInfo(b);
  if (info.can_extend === null) throw new BookingError("ต่อเวลาได้ระหว่างนัด (หลังเพื่อนถึงจุดนัดแล้ว)", "state");
  if (info.can_extend) throw new BookingError(info.can_extend, "limit");
  const price = info.hourly_satang;
  if (!(price > 0)) throw new BookingError("คำนวณค่าต่อเวลาไม่ได้ · ติดต่อทีมงาน", "bad");
  const avail = (await balances("customer", customer_id)).available ?? 0;
  if (avail < price) throw new BookingError(`ยอดในกระเป๋าไม่พอต่อเวลา (ต้องใช้ ${baht(price)} · ขาด ${baht(price - avail)}) · เติมเงินก่อนแล้วขอใหม่`, "funds", { need: price, available: avail, short: price - avail, topup: "/wallet" });
  // ชั่วโมงที่ต่อต้องไม่ชนนัดถัดไปของเพื่อน
  await checkSlot(b, Date.parse(b.starts_at), b.hours + info.extra_hours + 1, { schedule: false });
  const rules = await getCustomerRules();
  const c = await insertChange({ booking_id: b.id, kind: "extend", old_starts_at: null, new_starts_at: null, hours: 1, amount_satang: price, reason: null, expires_at: new Date(Date.now() + rules.extendWaitMinutes * 60_000).toISOString() });
  await addEvent(b.id, "extend_requested", `customer:${customer_id}`, { change: c.id, hours: 1, amount: price });
  await notify({ user_type: "parttime", user_id: b.parttime_id, kind: "booking_extend", title: `ลูกค้าขอต่อเวลา +1 ชม. · ${b.code}`, body: `ค่าบริการเพิ่ม ${baht(price)} · ตอบภายใน ${rules.extendWaitMinutes} นาที`, url: ptJobs(b) });
  return c;
}

export async function respondExtend(id: string, parttime_id: string, accept: boolean, reason = ""): Promise<Booking> {
  const b = await getBooking(id);
  if (!b || b.parttime_id !== parttime_id) throw new BookingError("ไม่พบงานนี้", "notfound");
  const rows = await listChanges([b.id]);
  const c = pendingOf(rows, "extend");
  if (!c) throw new BookingError("ไม่มีคำขอต่อเวลาที่รอตอบ (อาจหมดเวลาแล้ว)", "state");
  const actor = `parttime:${parttime_id}`;
  const fail = async (why: string, code: string, status: ChangeStatus = "failed") => {
    await patchChange(c.id, ["pending", "accepted"], { status, reason: why, decided_at: now(), decided_by: actor }).catch(() => null);
    await addEvent(b.id, `extend_${status}`, actor, { change: c.id, reason: why });
    await notify({ user_type: "customer", user_id: b.customer_id, kind: "booking_extend", title: `ต่อเวลา ${b.code} ไม่สำเร็จ`, body: code === "funds" ? `ยอดในกระเป๋าไม่พอ ${baht(c.amount_satang)} · เติมเงินแล้วขอใหม่ได้` : why, url: code === "funds" ? "/wallet" : `/order/${b.id}` });
  };
  if (!accept) {
    const r = await patchChange(c.id, ["pending"], { status: "declined", reason: reason.trim().slice(0, 200) || null, decided_at: now(), decided_by: actor });
    if (!r) throw new BookingError("คำขอนี้ตอบไปแล้ว", "state");
    await addEvent(b.id, "extend_declined", actor, { change: c.id });
    await notify({ user_type: "customer", user_id: b.customer_id, kind: "booking_extend", title: `${b.parttime_nick ?? "เพื่อน"} ไม่สะดวกต่อเวลา`, body: `${b.code} · ไม่มีการตัดเงิน`, url: `/order/${b.id}` });
    return b;
  }
  if (b.status !== "checked_in" || b.pt_done_at) { await fail("นัดนี้จบหรือเปลี่ยนสถานะแล้ว", "state"); throw new BookingError("นัดนี้จบหรือเปลี่ยนสถานะแล้ว · ต่อเวลาไม่ได้", "state"); }
  const ext = extendedOf(rows);
  try { await checkSlot(b, Date.parse(b.starts_at), b.hours + ext.hours + 1, { schedule: false }); }
  catch (e) { if (e instanceof BookingError) { await fail("ชั่วโมงที่ต่อชนกับนัดถัดไปของเพื่อน", "clash"); throw new BookingError("ชั่วโมงที่ต่อชนกับนัดถัดไปของคุณ · ต่อเวลาไม่ได้", "clash"); } throw e; }
  const claimed = await patchChange(c.id, ["pending"], { status: "accepted", decided_at: now(), decided_by: actor });
  if (!claimed) throw new BookingError("คำขอนี้ตอบไปแล้ว", "state");
  const amt = c.amount_satang;
  let r: Booking | null;
  try {
    // ตัดจากกระเป๋าลูกค้าเข้า escrow + เพิ่มค่าบริการ/ยอดรวม ในรายการเดียว (idem ต่อคำขอ — กดซ้ำไม่ตัดซ้ำ)
    r = await moveBooking(b.id, ["checked_in"], { price_satang: b.price_satang + amt, total_satang: b.total_satang + amt, extra_hours: ext.hours + 1 },
      { kind: "confirm", ref: { type: "booking", id: b.id }, idem: `extend:${c.id}`, note: `ต่อเวลา +1 ชม. ${b.code}`, actor, legs: [
        { owner_type: "customer", owner_id: b.customer_id, bucket: "available", amount: -amt },
        { owner_type: "platform", owner_id: PLATFORM, bucket: "escrow", amount: amt },
      ] });
  } catch (e) {
    if (e instanceof WalletError) { await fail("ยอดในกระเป๋าลูกค้าไม่พอ", "funds"); throw new BookingError("ยอดในกระเป๋าลูกค้าไม่พอ · แจ้งลูกค้าเติมเงินแล้วขอใหม่ได้", "funds"); }
    if (e instanceof BookingError && e.code === "clash") { await fail("ชั่วโมงที่ต่อชนกับนัดถัดไปของเพื่อน", "clash"); throw e; }
    await patchChange(c.id, ["accepted"], { status: "pending", decided_at: null, decided_by: null }).catch(() => null);
    throw e;
  }
  if (!r) { await fail("นัดนี้จบหรือเปลี่ยนสถานะแล้ว", "state"); throw new BookingError("นัดนี้จบหรือเปลี่ยนสถานะแล้ว · ต่อเวลาไม่ได้", "state"); }
  await addEvent(b.id, "extended", actor, { change: c.id, hours: 1, amount: amt, total_hours: b.hours + ext.hours + 1 });
  await notify({ user_type: "customer", user_id: b.customer_id, kind: "booking_extend", title: `ต่อเวลา +1 ชม. แล้ว · ${b.code}`, body: `ตัด ${baht(amt)} จากกระเป๋า · พักไว้กับเราจนจบนัด`, url: `/order/${b.id}` });
  await sendMessage(r, "system", null, `ต่อเวลา +1 ชม. แล้ว · รวม ${b.hours + ext.hours + 1} ชม.`).catch(() => {});
  return r;
}
