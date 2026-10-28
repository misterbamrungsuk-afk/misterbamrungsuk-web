// สิทธิ์แอดมิน + session แบบลงลายเซ็น (HMAC-SHA256)
// ใช้ได้ทั้งใน middleware (edge) และ route handler เพราะใช้ Web Crypto อย่างเดียว
import { isProdDeploy } from "./session-secret";

export const ADMIN_COOKIE = "mord_admin";
export const SESSION_HOURS = 8;

// ceo = เจ้าของระบบ: เข้าได้ทุกหน้า + คนเดียวที่อนุมัติรายได้เข้ากระเป๋า และอนุมัติคำขอถอนเงิน
export type AdminRole = "ceo" | "super" | "finance" | "cs" | "kyc";
export const ROLE_LABEL: Record<AdminRole, string> = {
  ceo: "CEO",
  super: "Super admin",
  finance: "การเงิน",
  cs: "CS",
  kyc: "ตรวจสอบ (KYC)",
};

// หน้าไหนบทบาทไหนเข้าได้ (ตรงกับตารางสิทธิ์ในดีไซน์)
export const PATH_ROLES: { prefix: string; roles: AdminRole[] }[] = [
  { prefix: "/admin/security", roles: ["super", "finance", "cs", "kyc"] }, // ตั้งค่า 2 ชั้นของบัญชีตัวเอง — ทุกบทบาท
  { prefix: "/admin/settings", roles: ["super"] },
  { prefix: "/admin/payouts", roles: ["super", "finance"] },
  { prefix: "/admin/income", roles: ["super", "finance"] },
  { prefix: "/admin/traffic", roles: ["super", "finance", "cs"] },
  { prefix: "/admin/collab", roles: ["super", "finance"] },
  { prefix: "/admin/payroll", roles: ["super", "finance"] },
  { prefix: "/admin/boosts", roles: ["super", "finance"] },
  { prefix: "/admin/sales", roles: ["super", "finance"] },
  { prefix: "/admin/recruit-programs", roles: ["super", "finance"] },
  { prefix: "/admin/applicants", roles: ["super", "finance"] },
  { prefix: "/admin/slips", roles: ["super", "finance"] },
  { prefix: "/admin/wallets", roles: ["super", "finance"] },
  { prefix: "/admin/wallet", roles: ["super", "finance"] },
  { prefix: "/admin/stays", roles: ["super", "finance"] },
  { prefix: "/admin/partners", roles: ["super", "finance"] },
  { prefix: "/admin/market", roles: ["super", "finance"] },
  { prefix: "/admin/cohorts", roles: ["super", "finance"] },
  { prefix: "/admin/earnings", roles: ["super", "finance"] },
  { prefix: "/admin/invites", roles: ["super", "finance"] },
  { prefix: "/admin/covers", roles: ["super"] }, // ยังไม่มีบทบาทฝ่ายการตลาด — เพิ่มที่นี่เมื่อมี
  { prefix: "/admin/kyc", roles: ["super", "kyc"] },
  { prefix: "/admin/cs", roles: ["super", "cs"] },
  { prefix: "/admin/reports", roles: ["super", "cs", "kyc"] },
  { prefix: "/admin/members", roles: ["super", "cs", "kyc"] },
  { prefix: "/admin/promos", roles: ["super", "finance"] },
  { prefix: "/admin/orders", roles: ["super", "finance", "cs"] },
  { prefix: "/admin/chats", roles: ["super", "cs"] },
  { prefix: "/admin/errors", roles: ["super"] },
  { prefix: "/admin/audit", roles: ["super", "finance", "cs", "kyc"] },
  { prefix: "/admin/appeals", roles: ["super", "cs"] },
  { prefix: "/admin", roles: ["super", "finance", "cs", "kyc"] }, // หน้าภาพรวม (ต้องอยู่ท้ายสุด)
];

export function canAccess(role: AdminRole, path: string) {
  if (role === "ceo") return true;
  const rule = PATH_ROLES.find((r) => path === r.prefix || path.startsWith(r.prefix + "/"));
  return !!rule && rule.roles.includes(role);
}

/** หน้าแรกที่บทบาทนี้เข้าได้ (ใช้ตอนถูกปฏิเสธสิทธิ์) */
export function homeFor(role: AdminRole) {
  // cs ไปหน้าตรวจงานตรง ๆ — ถ้าพาไป /admin/cs (หน้า redirect) ?denied=1 จะหลุดระหว่างทาง
  return role === "kyc" ? "/admin/kyc" : role === "cs" ? "/admin/orders" : "/admin";
}

/** mfa = ผ่านรหัส 2 ชั้นแล้ว (session ที่ไม่มีค่านี้ใช้ได้ตามเดิมเมื่อยังไม่เปิด "บังคับ 2 ชั้น") */
export type AdminSession = { email: string; role: AdminRole; exp: number; mfa?: boolean };
export const ADMIN_MFA_PENDING_COOKIE = "mord_admin_mfa";
export const MFA_PENDING_MINUTES = 5;

const isDemo = !process.env.DATABASE_URL && !isProdDeploy(); // เว็บจริงไม่มีโหมดสาธิตเด็ดขาด (ไม่มี DATABASE_URL บน Vercel)

/** secret สำหรับลงลายเซ็น: โหมดจริงต้องตั้ง ADMIN_SESSION_SECRET ไม่งั้นปิดระบบแอดมินทั้งหมด */
/** คีย์หลักของระบบแอดมิน (ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น — admin-mfa.ts เอาไปแตกคีย์เข้ารหัสด้วย HKDF) */
export function adminSecret(): string | null {
  return secret();
}
function secret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (s && s.length >= 32) return s;
  return isDemo ? "mord-demo-only-admin-session-secret-not-for-production" : null;
}

const enc = new TextEncoder();
function b64url(bytes: Uint8Array) {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
async function hmac(data: string, key: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}
function safeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

export async function signSession(email: string, role: AdminRole, opts: { mfa?: boolean } = {}): Promise<string | null> {
  const key = secret();
  if (!key) return null;
  const body: AdminSession = { email, role, exp: Date.now() + SESSION_HOURS * 3600_000 };
  if (opts.mfa) body.mfa = true;
  const payload = b64url(enc.encode(JSON.stringify(body)));
  return `${payload}.${b64url(await hmac(payload, key))}`;
}

// โทเคน "รหัสผ่านถูกแล้ว รอรหัส 2 ชั้น" (5 นาที) — ลงลายเซ็นด้วยคีย์คนละตัวกับ session และมี typ
// เอาไปใส่แทนคุกกี้ session ไม่ได้ (verifySession ปฏิเสธทุก token ที่มี typ)
export type MfaPending = { typ: "mfa-pending"; email: string; role: AdminRole; exp: number };
export async function signMfaPending(email: string, role: AdminRole): Promise<string | null> {
  const key = secret();
  if (!key) return null;
  const body: MfaPending = { typ: "mfa-pending", email, role, exp: Date.now() + MFA_PENDING_MINUTES * 60_000 };
  const payload = b64url(enc.encode(JSON.stringify(body)));
  return `${payload}.${b64url(await hmac(payload, key + "|mfa-pending"))}`;
}
export async function verifyMfaPending(token: string | undefined): Promise<MfaPending | null> {
  const key = secret();
  if (!key || !token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    if (!safeEqual(fromB64url(sig), await hmac(payload, key + "|mfa-pending"))) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as MfaPending;
    if (p.typ !== "mfa-pending" || !p.email || !(p.role in ROLE_LABEL) || p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

/** บทบาทปัจจุบันของอีเมลจากค่าตั้งใน env (ADMIN_EMAIL/ADMIN_PASSWORD = CEO · ADMIN_ACCOUNTS = email|role|salt:hash;...) */
function liveRole(email: string): AdminRole | null {
  const e = email.trim().toLowerCase();
  const simple = (process.env.ADMIN_EMAIL?.trim() || (process.env.ADMIN_PASSWORD ? "admin@misterbamrungsuk.com" : "")).toLowerCase();
  if (simple && process.env.ADMIN_PASSWORD && e === simple) return "ceo";
  for (const row of (process.env.ADMIN_ACCOUNTS ?? "").split(";")) {
    const [em, role] = row.split("|").map((x) => x.trim());
    if (em && em.toLowerCase() === e && role in ROLE_LABEL) return role as AdminRole;
  }
  return null;
}

export async function verifySession(token: string | undefined): Promise<AdminSession | null> {
  const key = secret();
  if (!key || !token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    if (!safeEqual(fromB64url(sig), await hmac(payload, key))) return null;
    const s = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as AdminSession & { typ?: string };
    if (s.typ || !s.email || !(s.role in ROLE_LABEL) || s.exp < Date.now()) return null;
    // เว็บจริง: บัญชีต้องยังอยู่และบทบาทยังตรง — ลบ/ลดสิทธิ์แอดมินแล้วมีผลทันที ไม่ต้องรอ token หมดอายุ
    if (isProdDeploy() && liveRole(s.email) !== s.role) return null;
    return s;
  } catch {
    return null;
  }
}
