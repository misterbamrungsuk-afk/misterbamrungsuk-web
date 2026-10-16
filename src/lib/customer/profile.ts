import "server-only";
import { customersEnabled, sbHeaders } from "./auth";

// ข้อมูลโปรไฟล์ลูกค้า (ชื่อ เบอร์ ผู้ติดต่อฉุกเฉิน เพื่อนที่ถูกใจ คำขอลบบัญชี) — Supabase REST หรือหน่วยความจำ (โหมดสาธิต)
export type Emergency = { name: string; tel: string; relation: string };
export type Profile = { id: string; email: string; name: string; phone: string | null; created_at: string; emergency: Emergency | null; favorites: string[]; delete_requested_at: string | null };

const SB = () => process.env.SUPABASE_URL || "";
const g = globalThis as unknown as { __mbCust?: Map<string, Profile> };
const demo: Map<string, Profile> = (g.__mbCust ??= new Map());
const COLS = "id,email,name,phone,created_at,emergency,favorites,delete_requested_at";

export async function getProfile(sub: string, email: string): Promise<Profile> {
  if (!customersEnabled() || sub.startsWith("demo:")) {
    if (!demo.has(sub)) demo.set(sub, { id: sub, email, name: email.split("@")[0], phone: null, created_at: new Date().toISOString(), emergency: null, favorites: [], delete_requested_at: null });
    return demo.get(sub)!;
  }
  const res = await fetch(`${SB()}/rest/v1/customers?id=eq.${encodeURIComponent(sub)}&select=${COLS}&limit=1`, { headers: sbHeaders(), cache: "no-store" });
  if (!res.ok) {
    // ยังไม่รันคอลัมน์ใหม่ → อ่านเฉพาะคอลัมน์เดิม
    const r2 = await fetch(`${SB()}/rest/v1/customers?id=eq.${encodeURIComponent(sub)}&select=id,email,name,phone,created_at&limit=1`, { headers: sbHeaders(), cache: "no-store" });
    const row = ((await r2.json().catch(() => [])) as Profile[])[0];
    return { ...(row ?? { id: sub, email, name: "", phone: null, created_at: new Date().toISOString() }), emergency: null, favorites: [], delete_requested_at: null };
  }
  const row = ((await res.json()) as Profile[])[0];
  return { ...row, favorites: row?.favorites ?? [], emergency: row?.emergency ?? null };
}

export async function updateProfile(sub: string, email: string, patch: Partial<Pick<Profile, "name" | "emergency" | "favorites" | "delete_requested_at">>): Promise<Profile> {
  if (!customersEnabled() || sub.startsWith("demo:")) {
    const p = await getProfile(sub, email);
    Object.assign(p, patch);
    return p;
  }
  const res = await fetch(`${SB()}/rest/v1/customers?id=eq.${encodeURIComponent(sub)}`, { method: "PATCH", headers: sbHeaders({ Prefer: "return=representation" }), body: JSON.stringify(patch) });
  if (!res.ok) throw new Error(`customers update ${res.status}`);
  return getProfile(sub, email);
}
