// สิทธิ์แอดมิน + session แบบลงลายเซ็น (HMAC-SHA256)
// ใช้ได้ทั้งใน middleware (edge) และ route handler เพราะใช้ Web Crypto อย่างเดียว
import { isProdDeploy } from "./session-secret";

export const ADMIN_COOKIE = "mord_admin";
export const SESSION_HOURS = 8;

export type AdminRole = "super" | "finance" | "cs" | "kyc";
export const ROLE_LABEL: Record<AdminRole, string> = {
  super: "Super admin",
  finance: "การเงิน",
  cs: "CS",
  kyc: "ตรวจสอบ (KYC)",
};

// หน้าไหนบทบาทไหนเข้าได้ (ตรงกับตารางสิทธิ์ในดีไซน์)
export const PATH_ROLES: { prefix: string; roles: AdminRole[] }[] = [
  { prefix: "/admin/settings", roles: ["super"] },
  { prefix: "/admin/payouts", roles: ["super", "finance"] },
  { prefix: "/admin/payroll", roles: ["super", "finance"] },
  { prefix: "/admin/applicants", roles: ["super", "finance"] },
  { prefix: "/admin/slips", roles: ["super", "finance"] },
  { prefix: "/admin/wallet", roles: ["super", "finance"] },
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
  { prefix: "/admin/audit", roles: ["super", "finance", "cs", "kyc"] },
  { prefix: "/admin", roles: ["super", "finance", "cs", "kyc"] }, // หน้าภาพรวม (ต้องอยู่ท้ายสุด)
];

export function canAccess(role: AdminRole, path: string) {
  const rule = PATH_ROLES.find((r) => path === r.prefix || path.startsWith(r.prefix + "/"));
  return !!rule && rule.roles.includes(role);
}

/** หน้าแรกที่บทบาทนี้เข้าได้ (ใช้ตอนถูกปฏิเสธสิทธิ์) */
export function homeFor(role: AdminRole) {
  return role === "kyc" ? "/admin/kyc" : role === "cs" ? "/admin/cs" : "/admin";
}

export type AdminSession = { email: string; role: AdminRole; exp: number };

const isDemo = !process.env.DATABASE_URL && !isProdDeploy(); // เว็บจริงไม่มีโหมดสาธิตเด็ดขาด (ไม่มี DATABASE_URL บน Vercel)

/** secret สำหรับลงลายเซ็น: โหมดจริงต้องตั้ง ADMIN_SESSION_SECRET ไม่งั้นปิดระบบแอดมินทั้งหมด */
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

export async function signSession(email: string, role: AdminRole): Promise<string | null> {
  const key = secret();
  if (!key) return null;
  const payload = b64url(enc.encode(JSON.stringify({ email, role, exp: Date.now() + SESSION_HOURS * 3600_000 })));
  return `${payload}.${b64url(await hmac(payload, key))}`;
}

export async function verifySession(token: string | undefined): Promise<AdminSession | null> {
  const key = secret();
  if (!key || !token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    if (!safeEqual(fromB64url(sig), await hmac(payload, key))) return null;
    const s = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as AdminSession;
    if (!s.email || !(s.role in ROLE_LABEL) || s.exp < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}
