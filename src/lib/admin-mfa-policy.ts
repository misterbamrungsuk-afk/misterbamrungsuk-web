// สวิตช์ "บังคับทุกบัญชีแอดมินใช้ 2 ชั้น" — ไฟล์นี้ต้องใช้ได้ใน middleware (edge) จึงใช้ fetch อย่างเดียว ไม่มี node:crypto
// ที่เก็บ: Supabase Storage  applicants/_config/admin-2fa-policy.json  (แบบเดียวกับ _config/chat.json)
// โหมดเดโม (ไม่มี SUPABASE_URL): เก็บใน globalThis ของฝั่ง node — middleware (edge sandbox) มองไม่เห็น จึงถามผ่าน /api/admin/security/policy
import type { NextRequest } from "next/server";

export const MFA_POLICY_PATH = "_config/admin-2fa-policy.json";
export const MFA_BUCKET = "applicants";
export type MfaPolicy = { enforce: boolean; at?: string; by?: string };

/** ทางออกฉุกเฉินของเจ้าของระบบ: ตั้ง ADMIN_MFA_OFF=1 ใน env = ข้ามรหัส 2 ชั้นทั้งระบบ (ล็อกอินด้วยรหัสผ่านอย่างเดียว + ไม่บังคับ) */
export const mfaOff = () => process.env.ADMIN_MFA_OFF === "1";
export const mfaHasStore = () => !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

/** อ่านไฟล์นโยบายจาก Storage ตรง ๆ (ใช้ได้ทั้ง edge และ node) · "missing" = ยังไม่เคยตั้ง · null = อ่านไม่ได้ */
export async function fetchStoragePolicy(): Promise<MfaPolicy | "missing" | null> {
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const r = await fetch(`${process.env.SUPABASE_URL!.replace(/\/+$/, "")}/storage/v1/object/${MFA_BUCKET}/${MFA_POLICY_PATH}`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (r.status === 400 || r.status === 404) return "missing";
    if (!r.ok) return null;
    const j = (await r.json()) as Partial<MfaPolicy>;
    return { enforce: j.enforce === true, at: j.at, by: j.by };
  } catch {
    return null;
  }
}

const g = globalThis as unknown as { __mbMfaEdge?: { v: boolean; at: number } };
const EDGE_CACHE_MS = 15_000;

/** middleware: เปิดบังคับ 2 ชั้นอยู่ไหม — อ่านไม่ได้ = ใช้ค่าล่าสุดที่รู้ (ไม่มี = ไม่บังคับ กันล็อกทุกคนตอนระบบไฟล์ล่ม) */
export async function mfaEnforcedEdge(req: NextRequest): Promise<boolean> {
  if (mfaOff()) return false;
  if (mfaHasStore()) {
    const c = g.__mbMfaEdge;
    if (c && Date.now() - c.at < EDGE_CACHE_MS) return c.v;
    const p = await fetchStoragePolicy();
    const v = p === null ? (c?.v ?? false) : p !== "missing" && p.enforce;
    g.__mbMfaEdge = { v, at: Date.now() };
    return v;
  }
  // โหมดเดโม: ถามฝั่ง node (ส่งคุกกี้ต่อ เผื่อมีรหัสเข้าเว็บ SITE_PASSWORD) · ไม่แคช ให้ชุดทดสอบเห็นผลทันที
  try {
    const r = await fetch(`${req.nextUrl.origin}/api/admin/security/policy`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
      signal: AbortSignal.timeout(20000), // dev คอมไพล์ route ครั้งแรกช้า
    });
    if (!r.ok) return false;
    return ((await r.json()) as { enforce?: boolean }).enforce === true;
  } catch {
    return false;
  }
}
