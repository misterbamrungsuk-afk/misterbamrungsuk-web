import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// โทเคนต่อขั้นตอน KYC/บัญชี หลังสมัคร — ลงลายเซ็น HMAC (ADMIN_SESSION_SECRET) อายุ 30 วัน
// ส่งทาง cookie httpOnly "mb_resume" (ตั้งตอน register) หรือ ?t= ในลิงก์
export const RESUME_COOKIE = "mb_resume";
export const RESUME_TTL_MS = 30 * 24 * 3600_000;

// โหมดจริงห้ามใช้ secret สำรอง (ปลอมโทเคนได้) — ไม่ตั้ง ADMIN_SESSION_SECRET = ล้มทันที
const secret = () => {
  const v = process.env.ADMIN_SESSION_SECRET;
  if (v) return v;
  if (process.env.VERCEL_ENV === "production") throw new Error("ADMIN_SESSION_SECRET is not set");
  return "hamoo-demo-secret";
};
const sign = (body: string) => createHmac("sha256", secret()).update(`resume:${body}`).digest("base64url");

export function signResume(mb: string) {
  const body = Buffer.from(JSON.stringify({ mb, exp: Date.now() + RESUME_TTL_MS })).toString("base64url");
  return `${body}.${sign(body)}`;
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

/** ผ่านถ้า cookie หรือ ?t= เป็นของ mb นี้ */
export async function canResume(mb: string, t?: string | null): Promise<boolean> {
  if (readResume(t) === mb) return true;
  return readResume((await cookies()).get(RESUME_COOKIE)?.value) === mb;
}
