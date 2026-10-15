import "server-only";
import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

// ลิงก์เชิญ (บอร์ด AdminInvites / JoinInvite) — ผู้สมัครจากลิงก์เชิญไม่ต้องชำระค่าการันตี Branding จ่ายเฉพาะค่าอบรม
// เก็บเป็น JSON ใน Storage bucket "applicants" (_config/invites.json) เหมือนราคาและส่วนแบ่ง · โหมดเดโมเก็บในหน่วยความจำ

export interface Invite {
  code: string;
  name: string;
  /** null = ไม่จำกัดจำนวนครั้ง */
  limit: number | null;
  used: number;
  /** YYYY-MM-DD (ใช้ได้ถึงสิ้นวันนั้น เวลาไทย) */
  expires: string;
  enabled: boolean;
  created_at: string;
  created_by: string;
}
export type InviteState = "ok" | "off" | "expired" | "full" | "missing";

const PATH = "_config/invites.json";
const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const g = globalThis as unknown as { __mbInvites?: Invite[] };
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export async function listInvites(): Promise<Invite[]> {
  if (isDemo) return g.__mbInvites ?? [];
  try {
    const { data, error } = await db().storage.from("applicants").download(PATH);
    if (error || !data) return [];
    return JSON.parse(await data.text()) as Invite[];
  } catch {
    return [];
  }
}

async function saveAll(list: Invite[]) {
  if (isDemo) { g.__mbInvites = list; return; }
  const { error } = await db().storage.from("applicants").upload(PATH, new Blob([JSON.stringify(list)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  if (error) throw error;
}

/** รหัส 6 ตัว (ตัดตัวที่สับสนง่าย 0/O/1/I) */
const newCode = () => { const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; return [...randomBytes(6)].map((b) => A[b % A.length]).join(""); };

export const isCode = (c: string) => /^[A-Z0-9]{6}$/.test(c);

export function stateOf(i: Invite | undefined, now = Date.now()): InviteState {
  if (!i) return "missing";
  if (!i.enabled) return "off";
  if (now > Date.parse(`${i.expires}T23:59:59+07:00`)) return "expired";
  if (i.limit !== null && i.used >= i.limit) return "full";
  return "ok";
}

export async function findInvite(code: string) {
  const c = code.toUpperCase();
  if (!isCode(c)) return { invite: undefined, state: "missing" as InviteState };
  const invite = (await listInvites()).find((i) => i.code === c);
  return { invite, state: stateOf(invite) };
}

export async function createInvite(name: string, limit: number | null, expires: string, by: string) {
  const list = await listInvites();
  let code = newCode();
  while (list.some((i) => i.code === code)) code = newCode();
  const inv: Invite = { code, name, limit, used: 0, expires, enabled: true, created_at: new Date().toISOString(), created_by: by };
  await saveAll([inv, ...list]);
  return inv;
}

export async function setInviteEnabled(code: string, enabled: boolean) {
  const list = await listInvites();
  const i = list.find((x) => x.code === code);
  if (!i) return null;
  i.enabled = enabled;
  await saveAll(list);
  return i;
}

/** นับการใช้ลิงก์เมื่อสมัครสำเร็จ — คืน false ถ้าลิงก์ใช้ไม่ได้แล้ว (เต็ม/หมดอายุ/ปิด) */
export async function consumeInvite(code: string) {
  const list = await listInvites();
  const i = list.find((x) => x.code === code);
  if (stateOf(i) !== "ok" || !i) return false;
  i.used += 1;
  await saveAll(list);
  return true;
}
