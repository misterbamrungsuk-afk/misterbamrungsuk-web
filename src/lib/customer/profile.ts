import "server-only";
import { customersEnabled, sbHeaders } from "./auth";

// ข้อมูลโปรไฟล์ลูกค้า (ชื่อ เบอร์ ผู้ติดต่อฉุกเฉิน เพื่อนที่ถูกใจ คำขอลบบัญชี) — Supabase REST หรือหน่วยความจำ (โหมดสาธิต)
export type Emergency = { name: string; tel: string; relation: string };
export type Address = { id: string; label: string; detail: string; note: string; primary: boolean };
export type Profile = { id: string; email: string; name: string; phone: string | null; created_at: string; emergency: Emergency | null; favorites: string[]; delete_requested_at: string | null; blocked: string[]; addresses: Address[] };

const SB = () => process.env.SUPABASE_URL || "";
const g = globalThis as unknown as { __mbCust?: Map<string, Profile> };
const demo: Map<string, Profile> = (g.__mbCust ??= new Map());
const COLS = "id,email,name,phone,created_at,emergency,favorites,delete_requested_at,blocked,addresses";

export async function getProfile(sub: string, email: string): Promise<Profile> {
  if (!customersEnabled() || sub.startsWith("demo:")) {
    if (!demo.has(sub)) demo.set(sub, { id: sub, email, name: email.split("@")[0], phone: null, created_at: new Date().toISOString(), emergency: null, favorites: [], delete_requested_at: null, blocked: [], addresses: [] });
    return demo.get(sub)!;
  }
  const res = await fetch(`${SB()}/rest/v1/customers?id=eq.${encodeURIComponent(sub)}&select=${COLS}&limit=1`, { headers: sbHeaders(), cache: "no-store" });
  if (!res.ok) {
    // ยังไม่รันคอลัมน์ใหม่ → อ่านเฉพาะคอลัมน์เดิม
    const r2 = await fetch(`${SB()}/rest/v1/customers?id=eq.${encodeURIComponent(sub)}&select=id,email,name,phone,created_at&limit=1`, { headers: sbHeaders(), cache: "no-store" });
    const row = ((await r2.json().catch(() => [])) as Profile[])[0];
    return { ...(row ?? { id: sub, email, name: "", phone: null, created_at: new Date().toISOString() }), emergency: null, favorites: [], delete_requested_at: null, blocked: [], addresses: [] };
  }
  const row = ((await res.json()) as Profile[])[0];
  return { ...row, favorites: row?.favorites ?? [], emergency: row?.emergency ?? null, blocked: row?.blocked ?? [], addresses: row?.addresses ?? [] };
}

export async function updateProfile(sub: string, email: string, patch: Partial<Pick<Profile, "name" | "emergency" | "favorites" | "delete_requested_at" | "blocked" | "addresses">>): Promise<Profile> {
  if (!customersEnabled() || sub.startsWith("demo:")) {
    const p = await getProfile(sub, email);
    Object.assign(p, patch);
    return p;
  }
  const res = await fetch(`${SB()}/rest/v1/customers?id=eq.${encodeURIComponent(sub)}`, { method: "PATCH", headers: sbHeaders({ Prefer: "return=representation" }), body: JSON.stringify(patch) });
  if (!res.ok) throw new Error(`customers update ${res.status}`);
  return getProfile(sub, email);
}

/** publicId ของเพื่อนที่ลูกค้าที่ล็อกอินอยู่บล็อกไว้ (ไม่ได้ล็อกอิน = ว่าง) — ซ่อนจากหน้าแรก/ค้นหา/แผนที่/เรียกด่วน และจองไม่ได้ */
export async function myBlocked(): Promise<Set<string>> {
  const { currentCustomer } = await import("./auth");
  const me = await currentCustomer().catch(() => null);
  if (!me) return new Set();
  return new Set((await getProfile(me.sub, me.email).catch(() => null))?.blocked ?? []);
}

/** โหมดสาธิต: โปรไฟล์ลูกค้าในหน่วยความจำทั้งหมด (หน้าแอดมินสมาชิก) */
export const listDemoProfiles = () => [...demo.values()];
