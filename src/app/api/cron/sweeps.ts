import "server-only";
import { createClient } from "@supabase/supabase-js";

// กวาดสถานะตามเวลาของทุกระบบ — ปกติแต่ละระบบกวาดตอนมีคนเปิดหน้า · รอบนี้กันค้างเมื่อไม่มีใครเปิด
// เรียกจาก /api/cron/money (รายวัน) และหน้าภาพรวมแอดมิน (แบบเบา) · แต่ละส่วนแยก try/catch — ส่วนหนึ่งพังไม่ลากส่วนอื่น
export type SweepResult = { ok: boolean; n?: number; error?: string; note?: string };
export type SweepSummary = Record<string, SweepResult>;

const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const msg = (e: unknown) => String((e as { message?: string })?.message ?? e).slice(0, 200);
async function run(fn: () => Promise<number | void>): Promise<SweepResult> {
  try { const n = await fn(); return typeof n === "number" ? { ok: true, n } : { ok: true }; }
  catch (e) { console.error("sweep", e); return { ok: false, error: msg(e) }; }
}

/** การจอง (หมดเวลาตอบรับ → คืนเงิน · จบงานอัตโนมัติ · ปล่อยรายได้) — listAll กวาดให้ตอนอ่าน */
const bookings = (limit: number) => run(async () => (await (await import("@/lib/bookings")).listAll(limit)).length);

/** เรียกด่วนหมดเวลา → คืนเงิน */
const quick = () => run(async () => { const r = await (await import("@/lib/bookings/quick")).sweepAll(); return Array.isArray(r) ? r.length : undefined; });

/** ห้องพัก: รอยืนยันเกินเวลา → คืนเงิน · เลยเช็กเอาต์ → แบ่งเงินเข้าโรงแรม · ค้าง "กำลังชำระ" → void */
const hotels = () => run(async () => (await import("@/lib/hotels/store")).sweep());

/** โทรในแอป: สายที่ค้าง ringing/active เกินเวลา → ปิดสาย */
const calls = () => run(async () => {
  type Call = import("@/lib/calls").Call;
  let rows: Call[];
  if (isDemo) rows = ((globalThis as unknown as { __mbCalls?: Call[] }).__mbCalls ?? []).filter((c) => c.status === "ringing" || c.status === "active");
  else {
    const { data, error } = await db().from("booking_calls").select().in("status", ["ringing", "active"]).limit(200);
    if (error) { if (/booking_calls|does not exist|schema cache/i.test(error.message)) return 0; throw error; }
    rows = (data ?? []) as Call[];
  }
  if (!rows.length) return 0;
  const out = await (await import("@/lib/calls")).sweep(rows);
  return out.filter((c, i) => c.status !== rows[i].status).length;
});

/** คำขอเปลี่ยนเวลา/ต่อเวลาที่เลยเวลาตอบ → หมดเวลา + แจ้งลูกค้า (listChanges ทำให้ตอนอ่าน) */
const changes = () => run(async () => {
  type Change = import("@/lib/bookings/changes").Change;
  const nowIso = new Date().toISOString();
  let ids: string[];
  if (isDemo) ids = ((globalThis as unknown as { __mbBookChanges?: Change[] }).__mbBookChanges ?? []).filter((c) => c.status === "pending" && c.expires_at <= nowIso).map((c) => c.booking_id);
  else {
    const { data, error } = await db().from("booking_changes").select("booking_id").eq("status", "pending").lt("expires_at", nowIso).limit(200);
    if (error) { if (/booking_changes|does not exist|schema cache/i.test(error.message)) return 0; throw error; }
    ids = (data ?? []).map((r) => String(r.booking_id));
  }
  const due = ids.length;
  ids = [...new Set(ids)];
  if (!ids.length) return 0;
  await (await import("@/lib/bookings/changes")).listChanges(ids);
  return due;
});

/** ร้านค้า: ออเดอร์โอนเงินที่ไม่ชำระภายใน 24 ชม. → ยกเลิก "หมดเวลาชำระ" (ออเดอร์กระเป๋าเงินไม่เกี่ยว) */
const market = () => run(async () => (await import("@/lib/market/store")).sweepOrders());

/** ทุกส่วน (cron รายวัน) */
export async function sweepAll(): Promise<SweepSummary> {
  // ทีละส่วนตามลำดับ (การจองก่อน) — กันส่วนต่าง ๆ แย่งแก้แถวเดียวกันพร้อมกัน
  const out: SweepSummary = {};
  out.bookings = await bookings(1000);
  out.quick = await quick();
  out.hotels = await hotels();
  out.calls = await calls();
  out.changes = await changes();
  out.market = await market();
  return out;
}

/** แบบเบาตอนเปิดหน้าภาพรวมแอดมิน — ส่วนที่ query ถูก (การจองถูกกวาดแล้วจาก overview().listAll) · เกิน 3 วิ = ปล่อยทำต่อเบื้องหลัง */
export async function sweepLight(): Promise<void> {
  const work = Promise.allSettled([hotels(), changes(), quick(), market()]);
  await Promise.race([work, new Promise((r) => setTimeout(r, 3000))]);
}
