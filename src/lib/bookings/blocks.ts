import "server-only";
import { createHash } from "node:crypto";
import { getById, saveProfile, type Applicant } from "@/lib/join/store";
import { BookingError, getBooking } from "./index";

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

/** Part-Time บล็อกลูกค้าของนัดนี้ */
export async function blockFromBooking(a: Applicant, bookingId: string): Promise<BlockedCustomer> {
  const b = await getBooking(bookingId);
  if (!b || b.parttime_id !== a.id) throw new BookingError("ไม่พบงานนี้", "notfound");
  const h = customerHash(b.customer_id);
  const cur = blockedOf(a);
  const had = cur.find((r) => r.h === h);
  if (had) return had;
  const first = String(b.customer_name ?? "").trim().split(/\s+/)[0]?.slice(0, 40) || "ลูกค้า";
  const row: BlockedCustomer = { h, name: first, code: b.code, at: new Date().toISOString() };
  await saveProfile(a.id, { blocked_customers: [row, ...cur].slice(0, MAX) });
  return row;
}
export async function unblock(a: Applicant, h: string): Promise<boolean> {
  const cur = blockedOf(a);
  const next = cur.filter((r) => r.h !== h);
  if (next.length === cur.length) return false;
  await saveProfile(a.id, { blocked_customers: next });
  return true;
}
