import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { adminSecret } from "@/lib/admin-auth";
import { hashPw, verifyPw } from "@/lib/join/pt-password";

// ห้อง CEO แยกลิงก์ + รหัสแยก (บอส 28 ต.ค. 2569): misterbamrungsuk.com/ceo
// · รหัส CEO ไม่เกี่ยวกับรหัสแอดมิน — ตั้งครั้งแรกโดยบัญชีแอดมิน CEO (เปิด /ceo ขณะล็อกอินแอดมิน CEO) แล้วเปลี่ยนได้ในห้อง CEO
// · การอนุมัติเงินทุกอย่าง (เข้ากระเป๋า / ถอน / โบนัส / ค่าคอม / ค่าห้อง) ต้องมีคุกกี้ห้อง CEO เท่านั้น
// · เก็บแฮช scrypt ใน Storage _config/ceo-room.json · เปลี่ยนรหัส = session เก่าทุกเครื่องใช้ไม่ได้ (after)
export const CEO_COOKIE = "mb_ceo";
export const CEO_SESSION_HOURS = 4;
const PATH = "_config/ceo-room.json";
type Conf = { hash: string; set_at: string; set_by: string; after: number };

const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const g = globalThis as unknown as { __mbCeoRoom?: Conf | null };

async function readConf(): Promise<Conf | null> {
  if (isDemo) return g.__mbCeoRoom ?? null;
  try { const { data, error } = await db().storage.from("applicants").download(PATH); if (error || !data) return null; const c = JSON.parse(await data.text()) as Conf; return c?.hash ? c : null; } catch { return null; }
}
async function writeConf(c: Conf) {
  if (isDemo) { g.__mbCeoRoom = c; return; }
  const { error } = await db().storage.from("applicants").upload(PATH, new Blob([JSON.stringify(c)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  if (error) throw error;
}

export class CeoAuthError extends Error {}
export const ceoPasswordSet = async () => !!(await readConf());

/** ตั้ง/เปลี่ยนรหัส CEO: ครั้งแรกต้องเป็นแอดมิน CEO (by) · ครั้งต่อไปต้องรู้รหัสเดิม */
export async function setCeoPassword(next: string, opts: { current?: string; by: string }) {
  if (next.length < 8 || next.length > 128) throw new CeoAuthError("รหัส CEO ต้องยาว 8 ตัวขึ้นไป");
  const cur = await readConf();
  if (cur && !verifyPw(String(opts.current ?? ""), cur.hash)) throw new CeoAuthError("รหัส CEO เดิมไม่ถูกต้อง");
  await writeConf({ hash: hashPw(next), set_at: new Date().toISOString(), set_by: opts.by, after: Date.now() });
}

export async function checkCeoPassword(pw: string): Promise<boolean> {
  const c = await readConf();
  return !!c && verifyPw(pw, c.hash);
}

const key = () => { const s = adminSecret(); return s ? s + "|ceo-room" : null; };
const sign = (payload: string, k: string) => createHmac("sha256", k).update(payload).digest("base64url");

export async function signCeoSession(): Promise<string | null> {
  const k = key();
  if (!k) return null;
  const payload = Buffer.from(JSON.stringify({ typ: "ceo-room", iat: Date.now(), exp: Date.now() + CEO_SESSION_HOURS * 3600_000, n: randomBytes(6).toString("hex") })).toString("base64url");
  return `${payload}.${sign(payload, k)}`;
}

/** คุกกี้ห้อง CEO ถูกต้อง + ยังไม่หมดอายุ + ออกหลังเปลี่ยนรหัสล่าสุด → ผู้อนุมัติ (actor) · ไม่งั้น null */
export async function ceoSession(): Promise<{ actor: string } | null> {
  const k = key();
  const raw = (await cookies()).get(CEO_COOKIE)?.value;
  if (!k || !raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const want = Buffer.from(sign(payload, k)), got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString()) as { typ: string; iat: number; exp: number };
    if (p.typ !== "ceo-room" || p.exp < Date.now()) return null;
    const c = await readConf();
    if (!c || p.iat < c.after) return null;
    return { actor: "ceo-room" };
  } catch { return null; }
}
