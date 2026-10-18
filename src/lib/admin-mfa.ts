import "server-only";
// ยืนยันตัวตน 2 ชั้นของแอดมิน (แอป Authenticator · TOTP RFC 6238: SHA-1 · 30 วินาที · 6 หลัก · ยอมคลาด ±1 ช่วง)
// บัญชีแอดมินอยู่ใน env (ADMIN_EMAIL/ADMIN_PASSWORD · ADMIN_ACCOUNTS) แก้ที่รันไทม์ไม่ได้ → ข้อมูล 2 ชั้นเก็บแยกตามอีเมล
//   ที่ Supabase Storage  applicants/_config/admin-2fa.json  (แบบเดียวกับไฟล์ตั้งค่าอื่นใน _config/)
//   โหมดเดโม (ไม่มี SUPABASE_URL) = ในหน่วยความจำ
// - secret เข้ารหัส AES-256-GCM ด้วยคีย์ที่แตกจาก ADMIN_SESSION_SECRET (HKDF-SHA256) — เปลี่ยน ADMIN_SESSION_SECRET = ทุกคนต้องตั้ง 2 ชั้นใหม่
// - รหัสกู้คืน 8 ชุด เก็บเป็น HMAC-SHA256 (ไม่เก็บตัวจริง) ใช้ได้ครั้งเดียว
// - กันใช้รหัสซ้ำ: จำช่วงเวลาที่ใช้ล่าสุด รหัสช่วงเดิม/ก่อนหน้าใช้ไม่ได้อีก
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { adminSecret, type AdminSession } from "./admin-auth";
import { listAdminAccounts } from "./admin-accounts";
import { MFA_BUCKET, MFA_POLICY_PATH, fetchStoragePolicy, mfaHasStore, mfaOff, type MfaPolicy } from "./admin-mfa-policy";

export { mfaOff };
const STORE_PATH = "_config/admin-2fa.json";
const ISSUER = "Mister Bamrungsuk";
const STEP_MS = 30_000;
const PENDING_MS = 15 * 60_000;
export const RECOVERY_COUNT = 8;

type Enrolled = { secret: string; recovery: string[]; enabled_at: string; last_step: number };
type Pending = { secret: string; at: number };
type Store = { accounts: Record<string, Enrolled>; pending: Record<string, Pending> };

const g = globalThis as unknown as { __mbMfa?: Store; __mbMfaPolicy?: MfaPolicy; __mbMfaLast?: Store };
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const norm = (email: string) => email.trim().toLowerCase();
const empty = (): Store => ({ accounts: {}, pending: {} });

// ── คีย์ ────────────────────────────────────────────────
function key(info: string): Buffer {
  const s = adminSecret();
  if (!s) throw new Error("ADMIN_SESSION_SECRET missing");
  return Buffer.from(hkdfSync("sha256", s, "mb-admin-2fa", info, 32));
}
function seal(plain: Buffer): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key("totp-secret-v1"), iv);
  const ct = Buffer.concat([c.update(plain), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}
function unseal(box: string): Buffer | null {
  try {
    const [v, iv, tag, ct] = box.split(".");
    if (v !== "v1") return null;
    const d = createDecipheriv("aes-256-gcm", key("totp-secret-v1"), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]);
  } catch {
    return null; // คีย์เปลี่ยน/ข้อมูลเสีย
  }
}
const normRecovery = (c: string) => c.toLowerCase().replace(/[^a-z0-9]/g, "");
const hashRecovery = (c: string) => createHmac("sha256", key("recovery-v1")).update(normRecovery(c)).digest("hex");

// ── TOTP ────────────────────────────────────────────────
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32(buf: Buffer): string {
  let bits = 0, val = 0, out = "";
  for (const b of buf) {
    val = ((val << 8) | b) & 0xffff;
    bits += 8;
    while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}
function hotp(secret: Buffer, counter: number): string {
  const c = Buffer.alloc(8);
  c.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", secret).update(c).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}
/** คืนเลขช่วงเวลาที่รหัสตรง (ยอมคลาด ±1 ช่วง) หรือ null */
function totpStep(secret: Buffer, code: string, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const s = Math.floor(now / STEP_MS);
  let hit: number | null = null;
  for (const d of [-1, 0, 1]) {
    if (timingSafeEqual(Buffer.from(hotp(secret, s + d)), Buffer.from(code))) hit = s + d; // วนครบทุกช่วง (เวลาเท่ากัน)
  }
  return hit;
}
const cleanCode = (c: unknown) => String(c ?? "").replace(/\s+/g, "").slice(0, 40);

// ── ที่เก็บ ────────────────────────────────────────────
function notFound(e: unknown) {
  const x = e as { statusCode?: string | number; status?: number; message?: string };
  return String(x?.statusCode) === "404" || x?.status === 404 || /not.?found/i.test(String(x?.message ?? ""));
}
/** อ่านไม่ได้ (ไม่ใช่ "ยังไม่มีไฟล์") = throw — ไม่ปล่อยผ่าน 2 ชั้นเงียบ ๆ ตอนระบบไฟล์ล่ม (ใช้ค่าที่อ่านได้ล่าสุดถ้ามี) */
async function load(): Promise<Store> {
  if (!mfaHasStore()) return (g.__mbMfa ??= empty());
  const { data, error } = await db().storage.from(MFA_BUCKET).download(STORE_PATH);
  if (error) {
    if (notFound(error)) return empty();
    if (g.__mbMfaLast) return structuredClone(g.__mbMfaLast);
    throw new Error("admin-2fa store unavailable: " + error.message);
  }
  const j = JSON.parse(await data.text()) as Partial<Store>;
  const s: Store = { accounts: j.accounts ?? {}, pending: j.pending ?? {} };
  g.__mbMfaLast = structuredClone(s);
  return s;
}
async function save(s: Store) {
  const now = Date.now();
  for (const [e, p] of Object.entries(s.pending)) if (now - p.at > PENDING_MS) delete s.pending[e];
  if (!mfaHasStore()) { g.__mbMfa = s; return; }
  const { error } = await db().storage.from(MFA_BUCKET).upload(STORE_PATH, new Blob([JSON.stringify(s)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  if (error) throw error;
  g.__mbMfaLast = structuredClone(s);
}

// ── API ─────────────────────────────────────────────────
export type MfaStatus = { enrolled: boolean; enabled_at: string | null; recovery_left: number; broken: boolean };
export async function mfaStatus(email: string): Promise<MfaStatus> {
  const a = (await load()).accounts[norm(email)];
  return { enrolled: !!a, enabled_at: a?.enabled_at ?? null, recovery_left: a?.recovery.length ?? 0, broken: !!a && !unseal(a.secret) };
}
/** บัญชีนี้ต้องใส่รหัส 2 ชั้นตอนเข้าสู่ระบบไหม (ADMIN_MFA_OFF=1 = ไม่ต้อง) */
export async function loginNeedsMfa(email: string): Promise<boolean> {
  if (mfaOff()) return false;
  return !!(await load()).accounts[norm(email)];
}
export async function enrolledEmails(): Promise<Record<string, string>> {
  const s = await load();
  return Object.fromEntries(Object.entries(s.accounts).map(([e, a]) => [e, a.enabled_at]));
}

/** เริ่มตั้งค่า: สร้าง secret ใหม่ (ยังไม่เปิดใช้จนกว่าจะยืนยันรหัส) */
export async function startEnroll(email: string): Promise<{ secret: string; uri: string }> {
  const e = norm(email);
  const s = await load();
  if (s.accounts[e]) throw new Error("already");
  const raw = randomBytes(20);
  s.pending[e] = { secret: seal(raw), at: Date.now() };
  await save(s);
  const b32 = base32(raw);
  const label = encodeURIComponent(`${ISSUER}:${e}`);
  return { secret: b32, uri: `otpauth://totp/${label}?secret=${b32}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30` };
}
function newRecovery(): string[] {
  const A = "abcdefghjkmnpqrstuvwxyz23456789"; // ตัดตัวที่สับสนง่าย (0/o 1/l/i)
  return Array.from({ length: RECOVERY_COUNT }, () => {
    const b = randomBytes(10);
    const s = Array.from(b, (x) => A[x % A.length]).join("");
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  });
}
/** ยืนยันรหัสแรก → เปิดใช้ + คืนรหัสกู้คืน (แสดงครั้งเดียว) · null = รหัสผิด/หมดเวลา */
export async function confirmEnroll(email: string, code: unknown): Promise<string[] | null> {
  const e = norm(email);
  const s = await load();
  const p = s.pending[e];
  if (!p || Date.now() - p.at > PENDING_MS || s.accounts[e]) return null;
  const raw = unseal(p.secret);
  const step = raw && totpStep(raw, cleanCode(code));
  if (step === null || step === undefined || !raw) return null;
  const codes = newRecovery();
  s.accounts[e] = { secret: p.secret, recovery: codes.map(hashRecovery), enabled_at: new Date().toISOString(), last_step: step };
  delete s.pending[e];
  await save(s);
  return codes;
}
/** ตรวจรหัส 6 หลัก หรือรหัสกู้คืน (ใช้แล้วลบทิ้ง) */
export async function verifyMfaCode(email: string, code: unknown, opts: { allowRecovery?: boolean } = { allowRecovery: true }): Promise<"totp" | "recovery" | null> {
  const e = norm(email);
  const c = cleanCode(code);
  if (!c) return null;
  const s = await load();
  const a = s.accounts[e];
  if (!a) return null;
  if (/^\d{6}$/.test(c)) {
    const raw = unseal(a.secret);
    const step = raw ? totpStep(raw, c) : null;
    if (step === null || step <= a.last_step) return null; // รหัสช่วงที่ใช้ไปแล้ว = ใช้ซ้ำไม่ได้
    a.last_step = step;
    await save(s);
    return "totp";
  }
  if (!opts.allowRecovery) return null;
  const h = Buffer.from(hashRecovery(c), "hex");
  const i = a.recovery.findIndex((x) => { const y = Buffer.from(x, "hex"); return y.length === h.length && timingSafeEqual(y, h); });
  if (i < 0) return null;
  a.recovery.splice(i, 1);
  await save(s);
  return "recovery";
}
export async function newRecoveryCodes(email: string): Promise<string[] | null> {
  const s = await load();
  const a = s.accounts[norm(email)];
  if (!a) return null;
  const codes = newRecovery();
  a.recovery = codes.map(hashRecovery);
  await save(s);
  return codes;
}
export async function removeMfa(email: string): Promise<boolean> {
  const e = norm(email);
  const s = await load();
  const had = !!s.accounts[e] || !!s.pending[e];
  delete s.accounts[e];
  delete s.pending[e];
  await save(s);
  return had;
}

// ── นโยบายบังคับ ───────────────────────────────────────
export async function getPolicy(): Promise<MfaPolicy> {
  if (!mfaHasStore()) return g.__mbMfaPolicy ?? { enforce: false };
  const p = await fetchStoragePolicy();
  if (p === null) return g.__mbMfaPolicy ?? { enforce: false };
  const v = p === "missing" ? { enforce: false } : p;
  g.__mbMfaPolicy = v;
  return v;
}
export async function mfaEnforced(): Promise<boolean> {
  return !mfaOff() && (await getPolicy()).enforce;
}
export async function setPolicy(enforce: boolean, by: string): Promise<MfaPolicy> {
  const p: MfaPolicy = { enforce, at: new Date().toISOString(), by };
  if (mfaHasStore()) {
    const { error } = await db().storage.from(MFA_BUCKET).upload(MFA_POLICY_PATH, new Blob([JSON.stringify(p)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
    if (error) throw error;
  }
  g.__mbMfaPolicy = p;
  return p;
}

// ── คุกกี้ ──────────────────────────────────────────────
export const cookieOpts = (req: Request, maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" && !req.url.startsWith("http://localhost"),
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});
export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

/** บันทึกเหตุการณ์ความปลอดภัยแอดมิน (แบบเดียวกับ admin_login: แจ้งเตือนแอดมิน + หน้า /admin/audit) */
export async function auditMfa(kind: string, title: string, req: Request) {
  await import("@/lib/bookings")
    .then((m) => m.notify({ user_type: "admin", user_id: "ceo", kind, title, body: `IP ${clientIp(req)} · ${(req.headers.get("user-agent") ?? "").slice(0, 120)}`, url: "/admin/audit" }))
    .catch(() => {});
}

/** สถานะสำหรับหน้า /admin/security (CEO เห็นรายชื่อบัญชีทั้งหมดว่าใครตั้ง 2 ชั้นแล้ว) */
export type SecurityStatus = MfaStatus & {
  ok: true; email: string; role: AdminSession["role"]; mfa_session: boolean; enforce: boolean;
  policy_at: string | null; policy_by: string | null; mfa_off: boolean;
  accounts?: { email: string; role: AdminSession["role"] | null; enrolled: boolean; enabled_at: string | null }[];
};
export async function statusFor(s: AdminSession): Promise<SecurityStatus> {
  const [st, policy] = await Promise.all([mfaStatus(s.email), getPolicy()]);
  const out: SecurityStatus = { ok: true, email: s.email, role: s.role, mfa_session: !!s.mfa, ...st, enforce: policy.enforce, policy_at: policy.at ?? null, policy_by: policy.by ?? null, mfa_off: mfaOff() };
  if (s.role === "ceo") {
    const on = await enrolledEmails();
    const known = listAdminAccounts();
    const extra = Object.keys(on).filter((e) => !known.some((k) => k.email === e)).map((email) => ({ email, role: null }));
    out.accounts = [...known, ...extra].map((a) => ({ ...a, enrolled: !!on[a.email], enabled_at: on[a.email] ?? null }));
  }
  return out;
}

