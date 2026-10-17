import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { balances, move, WalletError } from "@/lib/wallet";
import { getMoney } from "@/lib/wallet/settings";
import { extraOf, type Applicant } from "@/lib/join/store";
import { getLiveApplicants, publicId } from "@/lib/home/live";
import { hasContact } from "@/lib/join/contact-guard";
import { ACTIVITIES } from "@/lib/posts";
import { inThailand } from "@/lib/geo";
import { BookingError, createBooking, isDemo, listForParttime, notify, priceFor, requirePin, respond, type Booking, type Place, type PlaceType } from "./index";

// เรียกด่วน (บอร์ด C-QuickCall): ลูกค้าส่งคำขอ → กันเงิน (ยอดสูงสุดของเพื่อนที่ถูกเชิญ) → แจ้งเพื่อนที่ว่างวันนี้
// → เพื่อนคนแรกที่กดรับ = ได้นัด (คืนเงินที่กันไว้ แล้วจอง + ตอบรับตามราคาจริงของคนนั้นทันที)
// → ไม่มีใครรับในเวลา (ตั้งค่า quickSeconds) / ลูกค้ายกเลิก = คืนเงินที่กันไว้ · ทุกจุดเงินผ่าน wallet_move
export type QuickCall = {
  id: string; code: string; customer_id: string; customer_email: string | null; customer_name: string | null;
  activity: string; hours: 3 | 5; place: Place; note: string | null; hold_satang: number; invited: string[];
  status: "open" | "matched" | "expired" | "cancelled"; matched_parttime: string | null; booking_id: string | null; expires_at: string; created_at: string;
};
export const QUICK_PLACES: PlaceType[] = ["cafe", "mall", "outdoor", "out", "condo", "hotel"];
const LABEL: Record<string, string> = { out: "นอกสถานที่", outdoor: "กลางแจ้ง", mall: "ห้าง", cafe: "คาเฟ่ / ร้านอาหาร", condo: "คอนโด", hotel: "โรงแรม" };
const JS_DAY: Record<string, number> = { "อา": 0, "จ": 1, "อ": 2, "พ": 3, "พฤ": 4, "ศ": 5, "ส": 6 };
const MAX_INVITE = 20;

let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
const g = globalThis as unknown as { __mbQuick?: QuickCall[] };
const demo: QuickCall[] = (g.__mbQuick ??= []);
const now = () => new Date().toISOString();
const code = () => "QC-" + Math.random().toString(36).slice(2, 8).toUpperCase();
/** เวลานัดของเรียกด่วน: ช่อง 15 นาทีถัดไปที่ห่างจากตอนนี้อย่างน้อย 65 นาที (การจองต้องล่วงหน้า ≥ 1 ชม.) */
export const quickStart = (at = Date.now()) => { const t = at + 65 * 60_000; return new Date(Math.ceil(t / 900_000) * 900_000).toISOString(); };

/** เพื่อนที่ว่างวันนี้ (ประกาศว่าง / วันรับงาน / วันว่างในใบสมัคร) — ใช้ทั้งหน้าเรียกด่วนและการเชิญ */
export async function freeToday(): Promise<{ a: Applicant; note: string; hot: boolean }[]> {
  const today = new Date().getDay();
  return (await getLiveApplicants().catch(() => [] as Applicant[])).map((a) => {
    const x = extraOf(a);
    const post = x.post?.open ? x.post : null;
    const work = x.work?.days ? Object.entries(x.work.days).find(([k, d]) => d.on && JS_DAY[k] === today)?.[1] : null;
    const free = !!post || !!work || (x.availability?.week_days ?? []).some((k) => JS_DAY[k] === today);
    return free ? { a, note: post ? `${post.time} · ${post.zone}` : work ? `ว่าง ${work.from}–${work.to}` : "ว่างวันนี้", hot: !!post } : null;
  }).filter((r): r is { a: Applicant; note: string; hot: boolean } => !!r).sort((x, y) => Number(y.hot) - Number(x.hot));
}

async function insert(row: Omit<QuickCall, "id" | "created_at">): Promise<QuickCall> {
  if (isDemo) { const q: QuickCall = { ...row, id: crypto.randomUUID(), created_at: now() }; demo.unshift(q); return q; }
  const { data, error } = await db().from("quick_calls").insert(row).select().single();
  if (error) throw error;
  return data as QuickCall;
}
async function get(id: string): Promise<QuickCall | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  if (isDemo) return demo.find((q) => q.id === id) ?? null;
  const { data } = await db().from("quick_calls").select().eq("id", id).maybeSingle();
  return (data as QuickCall) ?? null;
}
const qmove = (q: QuickCall, from: QuickCall["status"][], patch: Partial<QuickCall>, release: boolean, actor: string, idem: string) =>
  move<QuickCall>({ table: "quick_calls", id: q.id, from, patch: patch as Record<string, unknown>, demoRow: () => demo.find((x) => x.id === q.id) },
    release ? { kind: "release", ref: { type: "quick", id: q.id }, idem, note: `คืนเงินเรียกด่วน ${q.code}`, actor, legs: [
      { owner_type: "customer", owner_id: q.customer_id, bucket: "held", amount: -q.hold_satang },
      { owner_type: "customer", owner_id: q.customer_id, bucket: "available", amount: q.hold_satang },
    ] } : null);

/** ยอดที่กันไว้ของเรียกด่วนที่ยังเปิดอยู่ (โหมดสาธิต — กระทบยอด) */
export const openHolds = () => demo.filter((q) => q.status === "open").reduce((s, q) => s + q.hold_satang, 0);

/** แจ้ง Part-Time ที่ถูกเชิญว่าคำขอนี้ปิดแล้ว (หมดเวลา/มีคนรับ/ลูกค้ายกเลิก) — กันกดรับของที่ไม่มีแล้ว */
async function notifyClosed(q: QuickCall, why: "expired" | "taken" | "cancelled", except?: string) {
  const apps = await getLiveApplicants().catch(() => [] as Applicant[]);
  const body = why === "taken" ? "มีเพื่อนรับนัดนี้ไปแล้ว" : why === "expired" ? "หมดเวลารับแล้ว" : "ลูกค้ายกเลิกการเรียก";
  for (const pid of q.invited) {
    if (pid === except) continue;
    const mb = apps.find((a) => a.id === pid)?.mb_code;
    await notify({ user_type: "parttime", user_id: pid, kind: "quick_closed", title: `เรียกด่วน ${q.code} ปิดแล้ว`, body, url: mb ? `/join/profile/${mb}/jobs` : null }).catch(() => {});
  }
}

/** หมดเวลา = คืนเงิน (ประมวลผลตอนอ่าน + cron) · ค้างที่ "matched" แต่ไม่มีนัด (ระบบล่มกลางทางตอนรับ) = กู้คืน */
async function sweep(rows: QuickCall[]): Promise<QuickCall[]> {
  const out: QuickCall[] = [];
  for (const q of rows) {
    if (q.status === "open" && Date.parse(q.expires_at) < Date.now()) {
      const r = await qmove(q, ["open"], { status: "expired" }, true, "system", `quick-release:${q.id}`).catch((e) => { console.error("quick sweep", e); return null; });
      if (r) {
        await notify({ user_type: "customer", user_id: q.customer_id, kind: "quick_expired", title: "ยังไม่มีเพื่อนรับเรียกด่วน", body: "คืนเงินที่กันไว้เข้ากระเป๋าแล้ว · ลองเลือกเพื่อนแล้วนัดล่วงหน้าได้", url: "/quick" });
        await notifyClosed(q, "expired");
      }
      out.push(r ?? q);
    } else if (q.status === "matched" && !q.booking_id && Date.parse(q.expires_at) + 5 * 60_000 < Date.now()) {
      // ค้าง matched โดยไม่มีเลขนัด = ระบบล่มก่อนสร้างนัด → เงินยังเป็นของเรียกด่วนใน held → คืนลูกค้า
      // (มีเลขนัดแล้ว = อาจย้ายเงินไปแล้ว ห้ามคืนซ้ำ — ปล่อยให้ทีมงานตรวจ)
      const r = await qmove(q, ["matched"], { status: "expired", matched_parttime: null }, true, "system:recover", `quick-release:${q.id}`).catch((e) => { console.error("quick recover", e); return null; });
      if (r) await notify({ user_type: "customer", user_id: q.customer_id, kind: "quick_failed", title: "เรียกด่วนไม่สำเร็จ", body: "คืนเงินที่กันไว้เข้ากระเป๋าแล้ว", url: "/quick" });
      out.push(r ?? q);
    } else out.push(q);
  }
  return out;
}
export async function sweepAll() {
  const rows = isDemo ? demo.filter((q) => q.status === "open" || (q.status === "matched" && !q.booking_id)) : (((await db().from("quick_calls").select().in("status", ["open", "matched"]).is("booking_id", null).limit(500)).data ?? []) as QuickCall[]);
  return sweep(rows.filter((q) => q.status === "open" || Date.parse(q.expires_at) + 5 * 60_000 < Date.now()));
}

export type QuickInput = { activity: string; hours: 3 | 5; place: { type: string; detail: string; lat?: unknown; lng?: unknown }; note: string; blocked?: string[] };

/** เพื่อนที่จะถูกเชิญจริง (ว่างวันนี้ · ไม่ถูกบล็อก · ไม่มีนัดชนเวลา) + ราคา — ใช้ทั้งตอนเรียกและหน้าฟอร์ม (ตัวเลขบนหน้าตรงกับที่กันจริง) */
export async function quickCandidates(hours: 3 | 5, blocked: string[]): Promise<{ a: Applicant; price: number }[]> {
  const start = Date.parse(quickStart());
  const cands: { a: Applicant; price: number }[] = [];
  for (const { a } of await freeToday()) {
    if (blocked.includes(publicId(a.mb_code))) continue; // ลูกค้าบล็อกไว้ = ไม่เชิญ
    if (extraOf(a).work?.paused) continue;
    const clash = (await listForParttime(a.id)).some((b) => ["requested", "accepted", "checked_in"].includes(b.status) && Math.abs(Date.parse(b.starts_at) - start) < Math.max(b.hours, hours) * 3600_000);
    if (!clash) cands.push({ a, price: (await priceFor(a, hours)) * 100 });
    if (cands.length >= MAX_INVITE) break;
  }
  return cands;
}
/** สรุปสำหรับหน้าฟอร์ม: จำนวนเพื่อนที่จะเห็นคำขอ + ยอดที่จะกัน (ราคาสูงสุดในกลุ่ม) ต่อระยะเวลา */
export async function quickPreview(blocked: string[]) {
  const [c3, c5] = await Promise.all([quickCandidates(3, blocked), quickCandidates(5, blocked)]);
  const max = (c: { price: number }[]) => (c.length ? Math.max(...c.map((x) => x.price)) : 0);
  return { count: { 3: c3.length, 5: c5.length }, hold: { 3: max(c3), 5: max(c5) } };
}
export async function createQuick(cust: { sub: string; email: string; name?: string }, input: QuickInput): Promise<QuickCall> {
  if (!ACTIVITIES.includes(input.activity)) throw new BookingError("เลือกกิจกรรม");
  const type = input.place.type as PlaceType;
  if (!QUICK_PLACES.includes(type)) throw new BookingError("เลือกประเภทสถานที่");
  const detail = input.place.detail.trim().slice(0, 200);
  if (!detail) throw new BookingError("กรอกจุดนัดพบ / ย่าน");
  const note = input.note.trim().slice(0, 300);
  if (hasContact(`${detail} ${note}`)) throw new BookingError("ห้ามใส่เบอร์โทร LINE หรือช่องทางติดต่อ");
  const mine = isDemo ? demo.filter((q) => q.customer_id === cust.sub) : (((await db().from("quick_calls").select().eq("customer_id", cust.sub).eq("status", "open")).data ?? []) as QuickCall[]);
  if ((await sweep(mine)).some((q) => q.status === "open")) throw new BookingError("มีเรียกด่วนที่รอเพื่อนรับอยู่แล้ว", "open");

  // หมุดจุดนัด (ไม่บังคับ) — ส่งต่อให้การจองเพื่อคิดระยะ/เวลาถึงตอนเพื่อนเดินทาง
  const pin = { lat: Math.round(Number(input.place.lat) * 1e5) / 1e5, lng: Math.round(Number(input.place.lng) * 1e5) / 1e5 };
  if (requirePin() && !inThailand(pin)) throw new BookingError("กดใช้ตำแหน่งปัจจุบัน หรือปักหมุดจุดนัดก่อนเรียก", "pin");
  // เชิญเพื่อนที่ว่างวันนี้และไม่มีนัดชนเวลา
  const cands = await quickCandidates(input.hours, input.blocked ?? []);
  if (!cands.length) throw new BookingError("ตอนนี้ยังไม่มีเพื่อนว่างรับเรียกด่วน · ลองเลือกเพื่อนแล้วนัดล่วงหน้า", "none");
  const hold = Math.max(...cands.map((c) => c.price));
  const bal = await balances("customer", cust.sub);
  if ((bal.available ?? 0) < hold) throw new BookingError("ยอดในกระเป๋าไม่พอ", "funds", { need: hold, available: bal.available ?? 0, short: hold - (bal.available ?? 0) });

  const m = await getMoney();
  const place: Place = { type, label: LABEL[type], detail, ...(inThailand(pin) ? pin : {}) };
  const row = await insert({
    code: code(), customer_id: cust.sub, customer_email: cust.email, customer_name: cust.name ?? null, activity: input.activity, hours: input.hours, place, note: note || null,
    hold_satang: hold, invited: cands.map((c) => c.a.id), status: "expired", matched_parttime: null, booking_id: null, expires_at: now(),
  });
  // แถวเริ่ม expired แล้วเปิดเป็น open พร้อมกันเงิน (อะตอมมิก)
  let q: QuickCall | null;
  try {
    q = await move<QuickCall>({ table: "quick_calls", id: row.id, from: ["expired"], patch: { status: "open", expires_at: new Date(Date.now() + m.quickSeconds * 1000).toISOString() }, demoRow: () => demo.find((x) => x.id === row.id) },
      { kind: "hold", ref: { type: "quick", id: row.id }, idem: `quick-hold:${row.id}`, note: `กันเงินเรียกด่วน ${row.code}`, actor: `customer:${cust.sub}`, legs: [
        { owner_type: "customer", owner_id: cust.sub, bucket: "available", amount: -hold },
        { owner_type: "customer", owner_id: cust.sub, bucket: "held", amount: hold },
      ] });
  } catch (e) {
    if (e instanceof WalletError) throw new BookingError("ยอดในกระเป๋าไม่พอ", "funds", { need: hold });
    throw e;
  }
  if (!q) throw new BookingError("ส่งคำขอไม่สำเร็จ กรุณาลองใหม่");
  for (const c of cands) await notify({ user_type: "parttime", user_id: c.a.id, kind: "quick_new", title: `🔔 เรียกด่วน · ${input.activity} ${input.hours} ชม.`, body: `${LABEL[type]} ${detail} · ฿${(c.price / 100).toLocaleString()} · คนแรกที่รับได้นัด (${Math.round(m.quickSeconds / 60)} นาที)`, url: `/join/profile/${c.a.mb_code}/jobs` });
  return q;
}

/** สถานะเรียกด่วนของลูกค้า (+ หมดเวลา = คืนเงิน) */
export async function getQuickForCustomer(id: string, sub: string): Promise<QuickCall | null> {
  const q = await get(id);
  if (!q || q.customer_id !== sub) return null;
  return (await sweep([q]))[0];
}
export async function openQuickForCustomer(sub: string): Promise<QuickCall | null> {
  const rows = isDemo ? demo.filter((q) => q.customer_id === sub) : (((await db().from("quick_calls").select().eq("customer_id", sub).order("created_at", { ascending: false }).limit(1)).data ?? []) as QuickCall[]);
  const [q] = await sweep(rows.slice(0, 1));
  return q ?? null;
}
export async function cancelQuick(id: string, sub: string) {
  const q = await get(id);
  if (!q || q.customer_id !== sub) throw new BookingError("ไม่พบคำขอ", "notfound");
  const r = await qmove(q, ["open"], { status: "cancelled" }, true, `customer:${sub}`, `quick-release:${q.id}`);
  if (!r) throw new BookingError("คำขอนี้ปิดไปแล้ว", "state");
  await notifyClosed(q, "cancelled");
  return r;
}

/** คำขอเรียกด่วนที่เชิญ Part-Time คนนี้และยังเปิดอยู่ */
export async function openForParttime(a: Applicant): Promise<{ q: QuickCall; price: number }[]> {
  const rows = isDemo ? demo.filter((q) => q.status === "open" && q.invited.includes(a.id))
    : (((await db().from("quick_calls").select().eq("status", "open").contains("invited", [a.id]).limit(20)).data ?? []) as QuickCall[]);
  const live = (await sweep(rows)).filter((q) => q.status === "open");
  const out: { q: QuickCall; price: number }[] = [];
  for (const q of live) out.push({ q, price: (await priceFor(a, q.hours)) * 100 });
  return out;
}

/** Part-Time กดรับ — คนแรกเท่านั้น (เงื่อนไข open → matched ในฐาน = ล็อก ยังไม่ย้ายเงิน) แล้วจอง + ตอบรับทันทีตามราคาจริง
 *  เงินกันของเรียกด่วนย้ายเป็นเงินกันของนัดในรายการเดียวกับการเปิดนัด (ส่วนต่างคืน available)
 *  สร้างนัดไม่สำเร็จ = ปลดล็อกกลับเป็น open (เงินยังกันไว้) ให้เพื่อนคนอื่นที่ถูกเชิญรับต่อได้ */
export async function acceptQuick(id: string, a: Applicant) {
  const q = await get(id);
  if (!q || !q.invited.includes(a.id)) throw new BookingError("ไม่พบคำขอนี้", "notfound");
  if (q.status !== "open" || Date.parse(q.expires_at) < Date.now()) throw new BookingError(q.status === "matched" ? "มีเพื่อนรับนัดนี้ไปแล้ว" : "คำขอนี้หมดเวลาแล้ว", "state");
  const lock = await qmove(q, ["open"], { status: "matched", matched_parttime: a.id }, false, `parttime:${a.id}`, "");
  if (!lock) throw new BookingError("มีเพื่อนรับนัดนี้ไปแล้ว", "state");
  const setBookingId = async (bid: string | null) => {
    if (isDemo) { const x = demo.find((y) => y.id === q.id); if (x) x.booking_id = bid; }
    else { const { error } = await db().from("quick_calls").update({ booking_id: bid }).eq("id", q.id); if (error) throw error; }
  };
  let b: Booking;
  try {
    b = await createBooking({ sub: q.customer_id, email: q.customer_email ?? "", name: q.customer_name ?? undefined },
      { pid: publicId(a.mb_code), hours: q.hours, starts_at: quickStart(), place: q.place, note: [`เรียกด่วน · ${q.activity}`, q.note].filter(Boolean).join(" · ") }, async () => a, 0,
      { quick: { hold: q.hold_satang, onInsert: (row) => setBookingId(row.id) } });
  } catch (e) {
    // ปลดล็อก: เงินกันยังอยู่ครบ (ยังไม่ย้าย) → เปิดให้คนอื่นรับต่อ · หมดเวลาไปแล้วระหว่างนี้ = sweep คืนเงินตามปกติ
    await setBookingId(null).catch((x) => console.error("quick unlock booking_id", x));
    const back = await qmove(q, ["matched"], { status: "open", matched_parttime: null }, false, "system", "").catch((x) => { console.error("quick unlock", x); return null; });
    if (back) await sweep([back]).catch(() => {});
    const why = e instanceof BookingError ? e.message : "ระบบขัดข้อง";
    if (!(e instanceof BookingError)) console.error("quick accept", e);
    throw new BookingError(`รับนัดไม่สำเร็จ · ${why}`, "accept_failed");
  }
  try {
    const acc = await respond(b.id, a.id, true);
    await notify({ user_type: "customer", user_id: q.customer_id, kind: "quick_matched", title: `${a.nickname ?? "เพื่อน"} รับเรียกด่วนแล้ว`, body: `${b.code} · เริ่ม ${new Date(b.starts_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" })} น.`, url: `/order/${b.id}` });
    await notifyClosed(q, "taken", a.id);
    return acc;
  } catch (e) {
    // นัดเปิดแล้ว (เงินเป็นของนัด) แต่ยืนยันไม่ผ่าน → นัดค้างเป็นคำขอ Part-Time กดรับในหน้างานได้ / หมดเวลาคืนเงินเอง
    console.error("quick respond", e);
    throw new BookingError("สร้างนัดแล้วแต่ยืนยันไม่สำเร็จ · กดรับงานนี้ในรายการงานอีกครั้ง", "state");
  }
}

// ข้อมูลที่ลูกค้าเห็น (ไม่ส่งรหัส Part-Time ภายใน) · รูปเพื่อนที่ถูกเชิญสูงสุด 4 คน
export async function quickView(q: QuickCall | null) {
  if (!q) return null;
  const apps = await getLiveApplicants().catch(() => []);
  const faces = q.invited.slice(0, 4).map((id) => apps.find((a) => a.id === id)).filter(Boolean).map((a) => `/api/public/pt-photo?id=${publicId(a!.mb_code)}&i=0`);
  return { id: q.id, code: q.code, activity: q.activity, hours: q.hours, place: q.place, hold_satang: q.hold_satang, invited: q.invited.length, faces, status: q.status, booking_id: q.booking_id, expires_at: q.expires_at, created_at: q.created_at };
}

