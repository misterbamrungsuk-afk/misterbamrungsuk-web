import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { COHORTS } from "./config";
import { TRAINING } from "./training";
import { isDemo } from "./store";

export type CohortStatus = "done" | "open" | "draft";
export const COHORT_STATUS_LABEL: Record<CohortStatus, string> = { done: "อบรมเสร็จแล้ว", open: "เปิดรับสมัคร", draft: "ร่าง" };
export const COHORT_STATUS_COLOR: Record<CohortStatus, string> = { done: "#7fd6a3", open: "#f0c75a", draft: "#ffd76a" };

export interface Cohort { key: string; name: string; date_text: string; venue: string; sessions: number; capacity: number; status: CohortStatus }
export interface CohortInput { name: string; date_text?: string; venue?: string; sessions?: number; capacity?: number; status?: CohortStatus }

let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));

const fallback = (): Cohort[] =>
  COHORTS.map((c) => ({
    key: c.key, name: c.name, date_text: c.date, venue: c.key === "1" ? TRAINING.venue : "",
    sessions: 5, capacity: c.capacity, status: c.date === "รอประกาศ" ? "draft" : "open",
  }));
const g = globalThis as unknown as { __mbCohortsDemo?: Cohort[] };
const demo = () => (g.__mbCohortsDemo ??= fallback());

/** กลุ่มอบรมทั้งหมด — จาก DB; ถ้าตารางยังไม่มี/ว่าง หรือโหมดเดโม ใช้ COHORTS ใน config */
export async function listCohorts(): Promise<Cohort[]> {
  if (isDemo) return demo();
  const { data, error } = await db().from("join_cohorts").select("key,name,date_text,venue,sessions,capacity,status").order("created_at").order("key");
  if (error || !data?.length) return fallback();
  return data as Cohort[];
}

export async function createCohort(input: CohortInput): Promise<Cohort> {
  const list = await listCohorts();
  const nums = list.map((c) => Number(c.key)).filter((n) => Number.isFinite(n));
  const row: Cohort = {
    key: String((nums.length ? Math.max(...nums) : 0) + 1),
    name: input.name.trim(),
    date_text: (input.date_text ?? "").trim() || "รอประกาศ",
    venue: (input.venue ?? "").trim(),
    sessions: Math.min(10, Math.max(1, Math.round(input.sessions ?? 5))),
    capacity: Math.min(500, Math.max(1, Math.round(input.capacity ?? 50))),
    status: input.status ?? "draft",
  };
  if (isDemo) { demo().push(row); return row; }
  const { error } = await db().from("join_cohorts").insert(row);
  if (error) throw error;
  return row;
}

/** แก้ข้อมูลกลุ่ม (ชื่อ/วัน/สถานที่/รอบ/ที่นั่ง/สถานะ) · "อบรมเสร็จแล้ว" = ปิดกลุ่ม (เก็บประวัติไว้) */
export async function updateCohort(key: string, input: Partial<CohortInput>): Promise<Cohort> {
  const cur = (await listCohorts()).find((c) => c.key === key);
  if (!cur) throw new Error("ไม่พบกลุ่มนี้");
  const row: Cohort = {
    ...cur,
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
    ...(input.date_text !== undefined ? { date_text: input.date_text.trim() || "รอประกาศ" } : {}),
    ...(input.venue !== undefined ? { venue: input.venue.trim() } : {}),
    ...(input.sessions ? { sessions: Math.min(10, Math.max(1, Math.round(input.sessions))) } : {}),
    ...(input.capacity ? { capacity: Math.min(500, Math.max(1, Math.round(input.capacity))) } : {}),
    ...(input.status ? { status: input.status } : {}),
  };
  if (isDemo) { const l = demo(); l[l.findIndex((c) => c.key === key)] = row; return row; }
  // กลุ่มจาก config (ยังไม่อยู่ใน DB) → upsert ให้มีแถวจริง
  const { error } = await db().from("join_cohorts").upsert(row, { onConflict: "key" });
  if (error) throw error;
  return row;
}

/** ลบกลุ่ม — ได้เฉพาะกลุ่มที่ยังไม่มีผู้สมัครถูกจัดเข้า (มีคนแล้ว = ใช้ "อบรมเสร็จแล้ว" แทน) */
export async function deleteCohort(key: string): Promise<void> {
  const { listApplicants, extraOf } = await import("./store");
  const used = (await listApplicants()).some((a) => extraOf(a).cohort === key);
  if (used) throw new Error("กลุ่มนี้มีผู้สมัครแล้ว ลบไม่ได้ · เปลี่ยนสถานะเป็น \"อบรมเสร็จแล้ว\" แทน");
  if (isDemo) { g.__mbCohortsDemo = demo().filter((c) => c.key !== key); return; }
  const { error } = await db().from("join_cohorts").delete().eq("key", key);
  if (error) throw error;
}

/** ที่นั่งที่ถูกใช้จริงต่อกลุ่ม (ใช้ทั้งหน้า /join และหน้าแอดมิน ให้ตัวเลขตรงกัน)
 *  = ผู้สมัครที่ยัง active (รอตรวจสลิป/ผ่านแล้ว) ที่จัดเข้ากลุ่มนั้น + คนที่ยังไม่ถูกจัดกลุ่ม (เติมเข้ากลุ่ม "เปิดรับสมัคร" แรกที่ยังว่าง)
 *  ผู้สมัครในกลุ่มที่อบรมเสร็จแล้ว/ร่าง นับเฉพาะคนที่จัดเข้ากลุ่มนั้นแล้ว */
export async function cohortTaken(): Promise<{ cohorts: Cohort[]; taken: Map<string, number> }> {
  const { listApplicants, extraOf } = await import("./store");
  const [cohorts, apps] = await Promise.all([listCohorts(), listApplicants()]);
  const keys = new Set(cohorts.map((c) => c.key));
  const taken = new Map<string, number>(cohorts.map((c) => [c.key, 0]));
  let unassigned = 0;
  for (const a of apps) {
    if (a.status !== "pending_slip" && a.status !== "verified") continue;
    const k = extraOf(a).cohort;
    if (k && keys.has(k)) taken.set(k, (taken.get(k) ?? 0) + 1);
    else unassigned++;
  }
  for (const c of cohorts.filter((x) => x.status === "open")) {
    const take = Math.min(Math.max(0, c.capacity - (taken.get(c.key) ?? 0)), unassigned);
    taken.set(c.key, (taken.get(c.key) ?? 0) + take);
    unassigned -= take;
  }
  return { cohorts, taken };
}

/** ที่นั่งกลุ่มอบรมถัดไป (นับจริง) — กลุ่มแรกที่ "เปิดรับสมัคร" และยังว่าง */
export async function nextCohortSeats(): Promise<{ cohort: string; left: number; quota: number; full: boolean }> {
  const { cohorts, taken } = await cohortTaken();
  const open = cohorts.filter((c) => c.status === "open");
  if (!open.length) return { cohort: "", left: 0, quota: 0, full: true };
  for (const c of open) {
    const left = c.capacity - (taken.get(c.key) ?? 0);
    if (left > 0) return { cohort: c.name, left, quota: c.capacity, full: false };
  }
  const last = open[open.length - 1];
  return { cohort: last.name, left: 0, quota: last.capacity, full: true };
}
