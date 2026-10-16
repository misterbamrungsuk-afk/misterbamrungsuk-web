import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// บัญชีลูกค้า (อีเมล+รหัสผ่าน) — Supabase REST (service role) หรือโหมดเดโมเมื่อไม่ได้ตั้ง env
export const SESSION_COOKIE = "hamoo_session";
export const SESSION_DAYS = 30;

const SB_URL = () => process.env.SUPABASE_URL || "";
const SB_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const customersEnabled = () => SB_URL().startsWith("http") && SB_KEY().length > 20;

export type Customer = { id: string; email: string; name: string; password_hash: string; created_at: string };

export function sbHeaders(extra: Record<string, string> = {}) {
  return { apikey: SB_KEY(), Authorization: `Bearer ${SB_KEY()}`, "Content-Type": "application/json", ...extra };
}

export async function findCustomer(email: string): Promise<Customer | null> {
  const res = await fetch(`${SB_URL()}/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=*&limit=1`, { headers: sbHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`customers select ${res.status}`);
  const rows = (await res.json()) as Customer[];
  return rows[0] ?? null;
}

/** คืน null ถ้าอีเมลซ้ำ */
export async function insertCustomer(email: string, name: string, password: string): Promise<Customer | null> {
  const res = await fetch(`${SB_URL()}/rest/v1/customers`, {
    method: "POST", headers: sbHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({ email, name, password_hash: makeHash(password) }),
  });
  if (res.status === 409) return null;
  if (!res.ok) throw new Error(`customers insert ${res.status}`);
  return ((await res.json()) as Customer[])[0];
}

/** บันทึกเบอร์ที่ยืนยัน OTP แล้ว (คอลัมน์จาก supabase/0002_noshow.sql) */
export async function setCustomerPhone(id: string, phone: string) {
  const res = await fetch(`${SB_URL()}/rest/v1/customers?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH", headers: sbHeaders(), body: JSON.stringify({ phone, phone_verified_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`customers phone ${res.status}`);
}

/** ดึงทั้งตาราง (สำหรับสำรองข้อมูล) — รวม password_hash เพื่อกู้คืนได้ */
export async function dumpTable(table: string): Promise<unknown[]> {
  const res = await fetch(`${SB_URL()}/rest/v1/${table}?select=*`, { headers: sbHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`${table} dump ${res.status}`);
  return (await res.json()) as unknown[];
}

export function makeHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export function checkHash(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const got = scryptSync(password, salt, 32);
  const want = Buffer.from(hash, "hex");
  return got.length === want.length && timingSafeEqual(got, want);
}

const secret = () => process.env.ADMIN_SESSION_SECRET || "hamoo-demo-secret";

/** token = base64url(json).hmac */
export function signCustomerSession(sub: string, email: string) {
  const body = Buffer.from(JSON.stringify({ sub, email, exp: Date.now() + SESSION_DAYS * 86400_000 })).toString("base64url");
  return `${body}.${createHmac("sha256", secret()).update(body).digest("base64url")}`;
}

export const sessionCookieOptions = {
  httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86400,
};

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

// กันเดารหัส (ในหน่วยความจำ — หลายเครื่องต้องย้ายไป Redis)
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max = 10, windowMs = 15 * 60_000) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > windowMs) hits.delete(k);
  return list.length > max;
}
export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

// ── ลืมรหัสผ่าน (บอร์ด C-Register "ลืมรหัสผ่าน" + C-ResetPassword) ──
// โทเคนผูกกับ hash รหัสเดิม → ตั้งรหัสใหม่แล้วลิงก์เดิมใช้ซ้ำไม่ได้ · อายุ 30 นาที
export const RESET_TTL_MS = 30 * 60_000;
const resetSig = (body: string, hash: string) => createHmac("sha256", secret()).update(`reset:${body}:${hash.slice(-16)}`).digest("base64url");
export function signReset(c: Pick<Customer, "email" | "password_hash">) {
  const body = Buffer.from(JSON.stringify({ email: c.email, exp: Date.now() + RESET_TTL_MS })).toString("base64url");
  return `${body}.${resetSig(body, c.password_hash)}`;
}
/** คืนลูกค้าถ้าโทเคนถูกต้อง ยังไม่หมดอายุ และรหัสยังไม่ถูกเปลี่ยน */
export async function readReset(token: string): Promise<Customer | null> {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  let p: { email?: string; exp?: number };
  try { p = JSON.parse(Buffer.from(body, "base64url").toString()); } catch { return null; }
  if (!p.email || !p.exp || p.exp < Date.now()) return null;
  const c = await findCustomer(p.email);
  if (!c) return null;
  const want = resetSig(body, c.password_hash);
  return want.length === sig.length && timingSafeEqual(Buffer.from(want), Buffer.from(sig)) ? c : null;
}
export async function setCustomerPassword(id: string, password: string) {
  const res = await fetch(`${SB_URL()}/rest/v1/customers?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH", headers: sbHeaders(), body: JSON.stringify({ password_hash: makeHash(password) }),
  });
  if (!res.ok) throw new Error(`customers password ${res.status}`);
}

// ── ตรวจ session ลูกค้า (ลายเซ็น HMAC + วันหมดอายุ) — ใช้กับทุก API ที่เกี่ยวกับเงิน/การจอง ──
export type CustomerSession = { sub: string; email: string };
export function readCustomerSession(token: string | undefined | null): CustomerSession | null {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const want = createHmac("sha256", secret()).update(body).digest("base64url");
  if (want.length !== sig.length || !timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as { sub?: string; email?: string; exp?: number };
    return p.sub && p.email && p.exp && p.exp > Date.now() ? { sub: p.sub, email: p.email } : null;
  } catch { return null; }
}
/** ลูกค้าที่ล็อกอินอยู่ (อ่านคุกกี้ในเซิร์ฟเวอร์) */
export async function currentCustomer(): Promise<CustomerSession | null> {
  const { cookies } = await import("next/headers");
  return readCustomerSession((await cookies()).get(SESSION_COOKIE)?.value);
}
