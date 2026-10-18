import "server-only";
import { createHash } from "node:crypto";
import { getById, saveProfile, type Applicant } from "@/lib/join/store";
import { BookingError, getBooking, listForParttime, notify, respond, type Booking } from "./index";

// Part-Time บล็อกลูกค้า (เก็บใน docs.extra.blocked_customers ของ Part-Time — ไม่ต้องมีตารางใหม่)
// · บล็อกแล้ว: โทรไม่ได้ทั้งสองทาง · ลูกค้าจอง/เรียกด่วนถึง Part-Time คนนี้ไม่ได้ · ส่งแชทไม่ได้ทั้งสองฝั่ง
// · ไม่เก็บรหัสลูกค้าตรง ๆ (รหัสโหมดสาธิตมีอีเมล) — เก็บ hash ของรหัส + ชื่อเล่น/เลขนัดที่ Part-Time เห็นอยู่แล้ว
export type BlockedCustomer = { h: string; name: string; code: string; at: string };
export const BLOCKED_MSG = "เพื่อนคนนี้ไม่รับนัดจากบัญชีของคุณ";
const MAX = 200;

export const customerHash = (customer_id: string) => createHash("sha256").update(`mb-block:${customer_id}`).digest("hex").slice(0, 24);
export function blockedOf(a: Applicant | null | undefined): BlockedCustomer[] {
  const x = ((a?.docs as Record<string, unknown> | undefined)?.extra as Record<string, unknown> | undefined)?.blocked_customers;
  return Array.isArray(x) ? (x as BlockedCustomer[]).filter((r) => r && typeof r.h === "string") : [];
}
/** a = Part-Time (มีข้อมูลอยู่แล้ว) — ไม่ต้องอ่านซ้ำ */
export const isBlockedBy = (a: Applicant | null | undefined, customer_id: string) => !!customer_id && blockedOf(a).some((r) => r.h === customerHash(customer_id));
export async function ptBlocks(parttime_id: string, customer_id: string): Promise<boolean> {
  return isBlockedBy(await getById(parttime_id).catch(() => null), customer_id);
}

/** Part-Time บล็อกลูกค้าของนัดนี้ (บันทึกอย่างเดียว) · fresh = เพิ่งบล็อกครั้งนี้ */
export async function blockFromBooking(a: Applicant, bookingId: string): Promise<BlockedCustomer & { fresh?: boolean }> {
  const b = await getBooking(bookingId);
  if (!b || b.parttime_id !== a.id) throw new BookingError("ไม่พบงานนี้", "notfound");
  const h = customerHash(b.customer_id);
  const cur = blockedOf(a);
  const had = cur.find((r) => r.h === h);
  if (had) return had;
  const first = String(b.customer_name ?? "").trim().split(/\s+/)[0]?.slice(0, 40) || "ลูกค้า";
  const row: BlockedCustomer = { h, name: first, code: b.code, at: new Date().toISOString() };
  await saveProfile(a.id, { blocked_customers: [row, ...cur].slice(0, MAX) });
  return { ...row, fresh: true };
}

// ── ผลของการบล็อกต่อนัดที่ยังไม่จบ ──
export const BLOCK_DECLINE_REASON = "เพื่อนไม่สะดวกรับนัดนี้";
const OPEN_ACCEPTED: Booking["status"][] = ["accepted", "checked_in", "cancel_requested"];
/** นัดที่ยังไม่จบระหว่าง Part-Time กับลูกค้าคนนี้: requested = ปฏิเสธอัตโนมัติ · accepted = แจ้งทีมงานจัดการ */
export async function blockImpact(parttime_id: string, customer_id: string): Promise<{ requested: Booking[]; accepted: Booking[] }> {
  const t = Date.now();
  const rows = (await listForParttime(parttime_id)).filter((b) => b.customer_id === customer_id && Date.parse(b.starts_at) + (b.hours + (b.extra_hours ?? 0)) * 3600_000 > t);
  const by = (x: Booking, y: Booking) => Date.parse(x.starts_at) - Date.parse(y.starts_at);
  return { requested: rows.filter((b) => b.status === "requested").sort(by), accepted: rows.filter((b) => OPEN_ACCEPTED.includes(b.status)).sort(by) };
}
/** ตัวเลขสำหรับหน้ายืนยันบล็อก (ยังไม่เปลี่ยนอะไร) */
export async function blockPreview(a: Applicant, bookingId: string) {
  const b = await getBooking(bookingId);
  if (!b || b.parttime_id !== a.id) throw new BookingError("ไม่พบงานนี้", "notfound");
  const x = await blockImpact(a.id, b.customer_id);
  return { requested: x.requested.length, accepted: x.accepted.length };
}
const whenTh = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const STATE_TH: Partial<Record<Booking["status"], string>> = { accepted: "ยืนยันแล้ว", checked_in: "อยู่ระหว่างนัด", cancel_requested: "ขอยกเลิกอยู่" };
/** บล็อก + ผลต่อเนื่อง: วางสายที่ดัง/คุยอยู่ระหว่างกัน · ปฏิเสธคำขอที่ยังไม่ตอบ (คืนเงินตามปกติ) · แจ้งทีมงานถึงนัดที่ยืนยันแล้ว */
export async function blockCustomer(a: Applicant, bookingId: string) {
  const b = await getBooking(bookingId);
  if (!b || b.parttime_id !== a.id) throw new BookingError("ไม่พบงานนี้", "notfound");
  const row = await blockFromBooking(a, bookingId);
  // import ตอนใช้ — lib/calls ใช้ ptBlocks จากไฟล์นี้ (กันวนตอนโหลดโมดูล)
  const calls = await import("@/lib/calls").then((m) => m.endCallsBetween(a.id, b.customer_id, "blocked")).catch((e) => { console.error("block end calls", e); return 0; });
  const x = await blockImpact(a.id, b.customer_id);
  let declined = 0;
  for (const r of x.requested) {
    try { await respond(r.id, a.id, false, BLOCK_DECLINE_REASON); declined++; }
    catch (e) { if (!(e instanceof BookingError)) console.error("block decline", r.id, e); }
  }
  // แจ้งทีมงานครั้งเดียวตอนบล็อกใหม่ (กดซ้ำไม่แจ้งซ้ำ)
  if (row.fresh && x.accepted.length) {
    const list = x.accepted.map((k) => `${k.code} · ${whenTh(k.starts_at)} · ${STATE_TH[k.status] ?? k.status}`).join("\n").slice(0, 900);
    await notify({
      user_type: "admin", user_id: "ops", kind: "pt_block",
      title: `${b.parttime_nick ?? "เพื่อน"} (${b.parttime_mb}) บล็อกลูกค้า · มีนัดค้าง ${x.accepted.length} นัด`,
      body: `${list}\nโทร/แชทระหว่างกันปิดแล้ว · ติดต่อทั้งสองฝั่งเพื่อจัดการนัดเหล่านี้`,
      url: "/admin/orders",
    }).catch((e) => console.error("block notify admin", e));
  }
  return { row, calls, declined, accepted: x.accepted.length };
}
export async function unblock(a: Applicant, h: string): Promise<boolean> {
  const cur = blockedOf(a);
  const next = cur.filter((r) => r.h !== h);
  if (next.length === cur.length) return false;
  await saveProfile(a.id, { blocked_customers: next });
  return true;
}
