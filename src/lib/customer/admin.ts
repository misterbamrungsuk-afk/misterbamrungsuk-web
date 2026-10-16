import "server-only";
import { randomBytes } from "node:crypto";
import { customersEnabled, forgetSession, makeHash, sbHeaders } from "./auth";
import { updateProfile } from "./profile";
import { balances } from "@/lib/wallet";
import { listForCustomer } from "@/lib/bookings";

// แอดมินจัดการสมาชิกลูกค้า (บอร์ด A-Members): รายชื่อ · ระงับ/คืนสิทธิ์ · ลบข้อมูลส่วนบุคคลตามคำขอ (PDPA)
// การลบ = ล้างชื่อ อีเมล เบอร์ ผู้ติดต่อฉุกเฉิน ที่อยู่ ฯลฯ แต่เก็บแถว (id) ไว้ เพราะบัญชีเงินและการจองต้องอ้างอิงได้ตามกฎหมายบัญชี
export type Member = { id: string; email: string; name: string; phone: string | null; created_at: string; delete_requested_at: string | null; suspended_at: string | null; suspend_reason: string | null; deleted_at: string | null };
const SB = () => process.env.SUPABASE_URL || "";
const g = globalThis as unknown as { __mbMembers?: Map<string, Partial<Member>> };
const demoState = (g.__mbMembers ??= new Map());
const COLS = "id,email,name,phone,created_at,delete_requested_at,suspended_at,suspend_reason,deleted_at";

export async function listMembers(): Promise<Member[]> {
  if (!customersEnabled()) {
    const { listDemoProfiles } = await import("./profile");
    return listDemoProfiles().map((p) => ({ id: p.id, email: p.email, name: p.name, phone: p.phone, created_at: p.created_at, delete_requested_at: p.delete_requested_at, suspended_at: null, suspend_reason: null, deleted_at: null, ...demoState.get(p.id) }));
  }
  const res = await fetch(`${SB()}/rest/v1/customers?select=${COLS}&order=created_at.desc&limit=1000`, { headers: sbHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`customers list ${res.status}`);
  return (await res.json()) as Member[];
}

/** สถานะที่ใช้ตัดสิน session/ล็อกอิน */
export async function memberFlags(id: string): Promise<Pick<Member, "suspended_at" | "deleted_at"> | null> {
  if (!customersEnabled() || id.startsWith("demo:")) { const s = demoState.get(id); return s ? { suspended_at: s.suspended_at ?? null, deleted_at: s.deleted_at ?? null } : null; }
  const res = await fetch(`${SB()}/rest/v1/customers?id=eq.${encodeURIComponent(id)}&select=suspended_at,deleted_at&limit=1`, { headers: sbHeaders(), cache: "no-store" });
  return res.ok ? (((await res.json()) as Member[])[0] ?? null) : null;
}

async function patch(id: string, body: Record<string, unknown>) {
  if (!customersEnabled() || id.startsWith("demo:")) { demoState.set(id, { ...demoState.get(id), ...body }); return; }
  const res = await fetch(`${SB()}/rest/v1/customers?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: sbHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`customers patch ${res.status}`);
}

export async function setSuspended(id: string, on: boolean, reason: string) {
  await patch(id, on ? { suspended_at: new Date().toISOString(), suspend_reason: reason.slice(0, 200) || null } : { suspended_at: null, suspend_reason: null });
  forgetSession(id);
}

export class MemberError extends Error {}
const OPEN = ["requested", "accepted", "checked_in", "cancel_requested", "disputed"];

/** ลบข้อมูลส่วนบุคคลตามคำขอ (PDPA) — ต้องไม่มีนัดค้าง และไม่มีเงินคงเหลือ/กันไว้ในกระเป๋า (คืนเงินก่อน) */
export async function eraseMember(id: string, email: string) {
  const [open, bal] = await Promise.all([listForCustomer(id).then((l) => l.filter((b) => OPEN.includes(b.status)).length), balances("customer", id)]);
  if (open) throw new MemberError(`ยังมีนัดที่ยังไม่จบ ${open} รายการ`);
  const money = (bal.available ?? 0) + (bal.held ?? 0);
  if (money) throw new MemberError(`ยังมีเงินในกระเป๋า ฿${(money / 100).toLocaleString()} · คืนเงินให้ลูกค้าก่อน (ปรับยอดพร้อมเหตุผล + โอนคืน)`);
  const anon = `deleted-${id.replace(/[^a-z0-9]/gi, "").slice(0, 12)}@deleted.invalid`;
  if (!customersEnabled() || id.startsWith("demo:")) {
    await updateProfile(id, email, { name: "ลบข้อมูลแล้ว", emergency: null, favorites: [], blocked: [], addresses: [] });
    demoState.set(id, { ...demoState.get(id), deleted_at: new Date().toISOString(), email: anon });
  } else {
    await patch(id, { email: anon, name: "ลบข้อมูลแล้ว", phone: null, emergency: null, favorites: [], blocked: [], addresses: [], password_hash: makeHash(randomBytes(24).toString("hex")), deleted_at: new Date().toISOString() });
  }
  forgetSession(id);
}
