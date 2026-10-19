import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sessionSecret } from "@/lib/session-secret";
import { cookies } from "next/headers";

// โทเคนต่อขั้นตอน KYC/บัญชี หลังสมัคร — ลงลายเซ็น HMAC (ADMIN_SESSION_SECRET) อายุ 30 วัน
// ส่งทาง cookie httpOnly "mb_resume" (ตั้งตอน register) หรือ ?t= ในลิงก์
export const RESUME_COOKIE = "mb_resume";
export const RESUME_TTL_MS = 30 * 24 * 3600_000;

// โหมดจริงห้ามใช้ secret สำรอง (ปลอมโทเคนได้) — ไม่ตั้ง ADMIN_SESSION_SECRET = ล้มทันที
const secret = () => sessionSecret();
const sign = (body: string) => createHmac("sha256", secret()).update(`resume:${body}`).digest("base64url");

export function signResume(mb: string) {
  const body = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + RESUME_TTL_MS })).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** เวลาออกโทเคน (โทเคนรุ่นเก่าไม่มี iat = คิดจาก exp − อายุ) */
export function iatOf(token: string | null | undefined): number {
  try { const p = JSON.parse(Buffer.from(String(token).split(".")[0], "base64url").toString()) as { iat?: number; exp: number }; return p.iat ?? p.exp - RESUME_TTL_MS; } catch { return 0; }
}

/** คืน mb_code ถ้าโทเคนถูกต้องและยังไม่หมดอายุ */
export function readResume(token: string | null | undefined): string | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const want = sign(body);
  if (want.length !== sig.length || !timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as { mb: string; exp: number };
    return p.exp > Date.now() ? p.mb : null;
  } catch { return null; }
}

/** โทเคนนี้ใช้ได้จริงไหม (ลายเซ็น + อายุ + ไม่ถูกยกเลิกด้วย "ออกจากระบบทุกเครื่อง"/แอดมิน) → mb หรือ null */
export async function liveResume(token: string | null | undefined): Promise<string | null> {
  const mb = readResume(token);
  if (!mb) return null;
  const after = await import("./store").then(async (m) => { const r = await m.getByMb(mb); return r ? m.extraOf(r).tokens_after ?? null : null; }).catch(() => null);
  return !after || iatOf(token) >= Date.parse(after) ? mb : null;
}

/** ผ่านถ้า cookie หรือ ?t= เป็นของ mb นี้ */
export async function canResume(mb: string, t?: string | null): Promise<boolean> {
  const tok = readResume(t) === mb ? t : (await cookies()).get(RESUME_COOKIE)?.value;
  if (readResume(tok) !== mb) return false;
  // "ออกจากระบบทุกเครื่อง" / แอดมินยกเลิกลิงก์ → โทเคนที่ออกก่อนเวลานั้นใช้ไม่ได้
  const after = await import("./store").then(async (m) => { const r = await m.getByMb(mb); return r ? m.extraOf(r).tokens_after ?? null : null; }).catch(() => null);
  return !after || iatOf(tok) >= Date.parse(after);
}
