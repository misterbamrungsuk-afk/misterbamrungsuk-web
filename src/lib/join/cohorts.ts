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
