import "server-only";
import { createClient } from "@supabase/supabase-js";

// error ที่เกิดในเบราว์เซอร์ของผู้ใช้จริง (เช่น React #418 hydration) — เก็บล่าสุด 300 รายการใน Storage JSON
// รวมรายการซ้ำ (ข้อความ + หน้า เดียวกัน) เป็นแถวเดียวแล้วนับจำนวน · ไม่เก็บข้อมูลส่วนตัว (ไม่มีอีเมล/คุกกี้/เนื้อหาหน้า)
export type ClientError = {
  key: string; message: string; path: string; count: number; first_at: string; last_at: string;
  ua: string; vw: number; vh: number; sw: boolean; ms: number; stack: string; kind: string;
};

const PATH = "_config/client-errors.json";
const MAX = 300;
const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const g = globalThis as unknown as { __mbClientErrors?: ClientError[] };

export async function listClientErrors(): Promise<ClientError[]> {
  if (isDemo) return g.__mbClientErrors ?? [];
  try {
    const { data, error } = await db().storage.from("applicants").download(PATH);
    if (error || !data) return [];
    return JSON.parse(await data.text()) as ClientError[];
  } catch { return []; }
}

async function save(rows: ClientError[]) {
  if (isDemo) { g.__mbClientErrors = rows; return; }
  await db().storage.from("applicants").upload(PATH, new Blob([JSON.stringify(rows)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
}

export async function recordClientError(e: Omit<ClientError, "key" | "count" | "first_at" | "last_at">): Promise<void> {
  const now = new Date().toISOString();
  const key = `${e.kind}|${e.message.slice(0, 120)}|${e.path}`;
  const rows = await listClientErrors();
  const hit = rows.find((r) => r.key === key);
  if (hit) Object.assign(hit, { count: hit.count + 1, last_at: now, ua: e.ua, vw: e.vw, vh: e.vh, sw: e.sw, ms: e.ms, stack: e.stack || hit.stack });
  else rows.unshift({ ...e, key, count: 1, first_at: now, last_at: now });
  rows.sort((a, b) => b.last_at.localeCompare(a.last_at));
  await save(rows.slice(0, MAX));
}

export async function clearClientErrors(): Promise<void> { await save([]); }
